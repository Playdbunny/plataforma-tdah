import { Router } from "express";
import passport from "passport";
import { signToken } from "./helpers/jwt-sign";

const router = Router();

// /auth/google?tdahType=inatento|hiperactivo|combinado
router.get("/google", (req, res, next) => {
  const tdahType = (req.query.tdahType as string) || null;

  // Validación simple (opcional)
  const valid = ["inatento", "hiperactivo", "combinado"];
  const finalTdah = valid.includes(String(tdahType)) ? tdahType : null;

  // serializamos un pequeño JSON como state
  const state = JSON.stringify({ tdahType: finalTdah });

  // pasamos state a passport.authenticate
  return passport.authenticate("google", {
    scope: ["profile", "email"],
    state,                      // <-- clave
  })(req, res, next);
});

// Callback: emite TU JWT y, si vino tdahType y el user lo tenía null, lo setea (lo haremos en la estrategia)
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/google/failure", session: true }),
  async (req: any, res) => {
    const user = req.user;
    const token = signToken({ sub: user.id, role: user.role });
    return res.json({ token, user: user.toJSON(), provider: "google" });
  }
);

router.get("/google/failure", (_req, res) => {
  res.status(401).json({ error: "No se pudo autenticar con Google" });
});

export default router;
