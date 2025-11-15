import { Router } from "express";
import upload from "../middleware/upload";
import { bucket } from "../lib/gcs";

const router = Router();

// POST /api/uploads/banner
// POST /api/uploads/avatar
// POST /api/uploads/video
// POST /api/uploads/presentacion
// POST /api/uploads/infografia

router.post("/:kind", upload.single("file"), async (req, res) => {
  const kind = req.params.kind as
    | "banner"
    | "avatar"
    | "video"
    | "presentacion"
    | "infografia";

  const file = req.file as Express.Multer.File;
  if (!file) return res.status(400).json({ message: "No se envió archivo" });

  // reglas según tipo
  let folder = "";
  let allowedMimes: string[] = [];

  switch (kind) {
    case "banner":
      folder = "banners";
      allowedMimes = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/jpg"];
      break;
    case "avatar":
      folder = "avatars";
      allowedMimes = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/jpg"];
      break;
    case "video":
      folder = "videos";
      allowedMimes = ["video/mp4", "video/webm"];
      break;
    case "presentacion":
      folder = "presentaciones";
      allowedMimes = ["application/pdf", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
      break;
    case "infografia":
      folder = "infografias";
      allowedMimes = ["image/png", "image/jpeg", "image/webp"];
      break;
    default:
      return res.status(400).json({ message: "Tipo de upload no válido" });
  }

  if (!allowedMimes.includes(file.mimetype)) {
    return res.status(400).json({
      message: `Tipo de archivo no permitido para ${kind}`,
    });
  }

  const gcsFileName = `${folder}/${Date.now()}-${file.originalname}`;
  const blob = bucket.file(gcsFileName);

  const stream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype,
    metadata: { cacheControl: "public, max-age=31536000" },
  });

  stream.on("error", (err) => {
    console.error("GCS ERROR:", err);
    return res.status(500).json({ message: "Error al subir archivo" });
  });

  stream.on("finish", () => {
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
    return res.json({ url: publicUrl });
  });

  stream.end(file.buffer);
});

export default router;