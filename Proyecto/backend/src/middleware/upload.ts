import multer from "multer";

// Guardamos el archivo en memoria (no en disco)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  // El frontend permite archivos de hasta 10MB; alineamos el límite aquí
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default upload;