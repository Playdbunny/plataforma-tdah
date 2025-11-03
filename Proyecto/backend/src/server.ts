import "dotenv/config";
import express, { Router } from "express";
import cors from "cors";
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
import Subject from "./models/Subject";
import Activity from "./models/Activity";

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

const bodyLimit = process.env.JSON_BODY_LIMIT || "10mb";
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

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

const apiRouter = Router();

apiRouter.use("/admin", adminRouter);
apiRouter.use("/admin", adminStudentsRouter);
apiRouter.use("/admin", adminActivitiesRouter);
apiRouter.use("/admin", adminSubjectsRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/auth", googleRouter);
apiRouter.use("/profile", profileRouter);

apiRouter.get("/me", requireAuth, (req: any, res) => {
  res.json({ userId: req.auth.sub, role: req.auth.role });
});

apiRouter.get("/admin/ping", requireAuth, requireRole("admin"), (_req, res) => {
  res.json({ pong: true });
});

app.use("/api", apiRouter);

const PORT = process.env.PORT || 4000;

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
    console.log(`🚀 API corriendo en http://localhost:${PORT}`);
  });
})();

