import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db";
import authRouter from "./routes/auth.routes";
import { requireAuth, requireRole } from "./middleware/requireAuth";
import adminRouter from "./routes/admin.routes";
import session from "express-session";
import passport from "passport";
import { initGoogleStrategy } from "./auth/google";
import googleRouter from "./routes/google.routes";
import adminActivitiesRouter from "./routes/adminActivities.routes";
import adminSubjectsRouter from "./routes/adminSubjects.routes";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/admin", adminRouter);
app.use("/auth", authRouter);

// Ruta protegida genérica
app.get("/me", requireAuth, (req: any, res) => {
  res.json({ userId: req.auth.sub, role: req.auth.role });
});
// Ruta solo para admins
app.get("/admin/ping", requireAuth, requireRole("admin"), (_req, res) => {
  res.json({ pong: true });
});

app.get("/me", requireAuth, (req: any, res) => {
  res.json({ userId: req.auth.sub, role: req.auth.role });
});
app.get("/admin/ping", requireAuth, requireRole("admin"), (_req, res) => {
  res.json({ pong: true });
});

// 1) Sesión mínima para el handshake de OAuth (no para proteger APIs)
app.use(session({
  secret: process.env.SESSION_SECRET as string,
  resave: false,
  saveUninitialized: false,
}));
// 2) Passport
app.use(passport.initialize());
app.use(passport.session());
initGoogleStrategy();
// 3) Rutas de Google OAuth
app.use("/auth", googleRouter);

const PORT = process.env.PORT || 4000;

(async () => {
  if (process.env.MONGO_URI) {
    await connectDB(process.env.MONGO_URI);
  } else {
    console.warn("⚠️ MONGO_URI no definido. El servidor corre sin DB.");
  }

  app.listen(PORT, () => {
    console.log(`🚀 API corriendo en http://localhost:${PORT}`);
  });
})();

// Ruta de adminActivity
app.use(adminActivitiesRouter);
// Ruta de adminSubjects
app.use(adminSubjectsRouter);

