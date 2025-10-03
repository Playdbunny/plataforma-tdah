import { Router, Request, Response, NextFunction } from 'express';
import Activity, { IActivity } from '../models/Activity';
import { requireAuth, requireRole } from '../middleware/requireAuth';

// Extiende la interfaz Request para incluir user con role
declare global {
  namespace Express {
    interface User {
      role: string;
      // otros campos si es necesario
    }
    interface Request {
      user?: User;
    }
  }
}

const router = Router();

// Centralizado manejo de errores
function handleError(res: Response, err: any) {
  if (err.name === 'ValidationError' || err.code === 11000) {
    return res.status(422).json({ message: err.message });
  }
  return res.status(500).json({ message: 'Error interno del servidor.' });
}

// CREATE
router.post('/admin/activities', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const activity = new Activity(req.body);
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
    if (!activity) return res.status(404).json({ message: 'Actividad no encontrada.' });
    res.json(activity);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE
router.delete('/admin/activities/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id);
    if (!activity) return res.status(404).json({ message: 'Actividad no encontrada.' });
    res.json({ message: 'Actividad eliminada.' });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
