import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Activity, { IActivity } from '../models/Activity';
import { requireAuth, requireRole, AuthPayload } from '../middleware/requireAuth';

const Subject =
  mongoose.models.Subject ||
  mongoose.model(
    'Subject',
    new mongoose.Schema({}, { strict: false }),
    'subjects',
  );

// Extiende la interfaz Request para incluir user con role
declare global {
  namespace Express {
    interface User {
      role: string;
      // otros campos si es necesario
    }
    interface Request {
      user?: User;
      auth?: AuthPayload;
    }
  }
}

const router = Router();

// Centralizado manejo de errores
function handleError(res: Response, err: any) {
  if (err?.name === 'ValidationError' || err?.code === 11000) {
    return res.status(422).json({ error: err.message });
  }
  return res.status(500).json({ error: 'Error interno del servidor.' });
}

// CREATE
router.post('/admin/activities', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { subjectId, subjectSlug } = req.body ?? {};

    let subject = null;
    if (subjectId) {
      subject = await Subject.findById(subjectId);
    }
    if (!subject && subjectSlug) {
      subject = await Subject.findOne({ slug: subjectSlug });
    }

    if (!subject) {
      return res.status(404).json({
        error: 'Materia no encontrada para asociar la actividad.',
      });
    }

    const createdBy = req.auth?.sub;
    if (!createdBy) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }

    const payload: Partial<IActivity> = {
      ...req.body,
      subjectId: subject._id,
      subjectSlug: req.body?.subjectSlug ?? subject.slug,
      createdBy,
    };

    const activity = new Activity(payload);
    await activity.save();
    res.status(201).json(activity);
  } catch (err) {
    handleError(res, err);
  }
});

// READ
router.get('/admin/activities', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const activities = await Activity.find();
    res.json(activities);
  } catch (err) {
    handleError(res, err);
  }
});

// UPDATE
router.put('/admin/activities/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const activity = await Activity.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!activity) return res.status(404).json({ error: 'Actividad no encontrada.' });
    res.json(activity);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE
router.delete('/admin/activities/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id);
    if (!activity) return res.status(404).json({ error: 'Actividad no encontrada.' });
    res.json({ message: 'Actividad eliminada.' });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
