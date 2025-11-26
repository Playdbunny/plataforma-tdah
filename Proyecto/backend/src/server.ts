import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import path from "path";
import { connectDB } from "./db";
import authRouter from "./routes/auth.routes";
import profileRouter from "./routes/profile.routes";
import { requireAuth, requireRole } from "./middleware/requireAuth";
import adminRouter from "./routes/admin.routes";
import session from "express-session";
import passport from "passport";
import { initGoogleStrategy } from "./auth/google";
import googleRouter from "./routes/google.routes";
import adminActivitiesRouter from "./routes/adminActivities.routes";
import adminSubjectsRouter from "./routes/adminSubjects.routes";
import adminStudentsRouter from "./routes/adminStudents.routes";
import studentActivitiesRouter from "./routes/studentActivities.routes";
import Subject from "./models/Subject";
import Activity from "./models/Activity";

const app = express();
const apiRouter = express.Router();

const PORT = Number(process.env.PORT) || 4000;

const allowedOrigins = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  process.env.CORS_ORIGIN,      // <- URL de Vercel
].filter(Boolean) as string[];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Seguridad: cabeceras HTTP
app.use(helmet());
// Habilitar HSTS en producción y confiar en proxy si aplica
if (process.env.NODE_ENV === "production") {
  app.enable("trust proxy");
  app.use(helmet.hsts({ maxAge: 31536000 }));
}

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Sanitiza campos potencialmente peligrosos para Mongo (evita $/$dot injection)
// Se aplica DESPUÉS de parsear body, para evitar conflictos con Express 5
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[mongoSanitize] Campo peligroso removido: ${key} en ${req.method} ${req.url}`);
  },
}));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// 1) Sesión mínima para el handshake de OAuth (no para proteger APIs)
app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
  }),
);
// 2) Passport
app.use(passport.initialize());
app.use(passport.session());
initGoogleStrategy();

// Health-check para el proxy de desarrollo
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Rutas bajo /api
apiRouter.use("/auth", authRouter);
apiRouter.use("/auth", googleRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/admin", adminStudentsRouter);
apiRouter.use(adminActivitiesRouter);
apiRouter.use(adminSubjectsRouter);
apiRouter.use(studentActivitiesRouter);

// Ruta protegida genérica
apiRouter.get("/me", requireAuth, (req: any, res) => {
  res.json({ userId: req.auth.sub, role: req.auth.role });
});
// Ruta solo para admins
apiRouter.get("/admin/ping", requireAuth, requireRole("admin"), (_req, res) => {
  res.json({ pong: true });
});

app.use("/api", apiRouter);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[unhandled]", err);
  res.status(500).json({ error: "INTERNAL_ERROR" });
});

(async () => {
  if (process.env.MONGO_URI) {
    await connectDB(process.env.MONGO_URI);

    if (process.env.NODE_ENV !== "production") {
      try {
        await Promise.all([Subject.syncIndexes(), Activity.syncIndexes()]);
        console.log("[indexes] Sincronizados");
      } catch (error) {
        console.error("[indexes] Error al sincronizar", error);
      }
    }
  } else {
    console.warn("⚠️ MONGO_URI no definido. El servidor corre sin DB.");
  }

  app.listen(PORT, () => {
    console.log(`🚀 API corriendo en puerto ${PORT}`);
  });
})();
