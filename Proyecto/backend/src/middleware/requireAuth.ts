import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  sub: string;                // user.id → lo guardamos en el "subject"
  role: "student" | "admin";  // rol del usuario
  avatarUrl?: string | null;   // avatar corto opcional
  iat: number;                // issued at (lo pone JWT automáticamente)
  exp: number;                // expiration (lo pone JWT automáticamente)
}

/** Middleware que exige token válido */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  // Esperamos "Authorization: Bearer <token>"
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token requerido" });

  try {
    // Verificamos el token con nuestra secret
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;

    // Guardamos los datos del token en la request (para usarlos en las rutas)
    (req as any).auth = payload; // guardamos info en req.auth

    next(); // sigue la ejecución de la ruta
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

/** Middleware que exige un rol específico */
export function requireRole(role: "student" | "admin") {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.auth || req.auth.role !== role ) {
      return res.status(403).json({ error: "No autorizado" });
    }
    next();
  };
}
