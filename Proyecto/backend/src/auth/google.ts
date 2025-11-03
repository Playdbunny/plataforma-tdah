import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import argon2 from "argon2";
import crypto from "crypto";
import { User } from "../models/User";

export function initGoogleStrategy() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    console.warn("⚠️ Google OAuth vars missing; Google login disabled");
    return;
  }

  passport.use(new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      passReqToCallback: true,                 // <-- para leer req.query.state
    },
    // verify(req, accessToken, refreshToken, profile, done)
    async (req: any, _access: string, _refresh: string, profile: Profile, done) => {
      try {
        // Recuperamos state del inicio (/auth/google?tdahType=...)
        let tdahFromState: any = null;
        try {
          if (req?.query?.state) {
            const parsed = JSON.parse(String(req.query.state));
            const valid = ["inatento", "hiperactivo", "combinado"];
            if (parsed && valid.includes(parsed.tdahType)) {
              tdahFromState = parsed.tdahType;
            }
          }
        } catch { /* ignorar parse error */ }

        const googleId = profile.id;
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const name = profile.displayName || "Usuario Google";
        if (!email) return done(new Error("No pudimos obtener el email de Google"), undefined);

        let user = await User.findOne({ googleId });
        const now = new Date();

        // si no existe por googleId, tratamos de enlazar por email
        if (!user) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId = googleId;
            user.authProvider = "google";
            // si venía TDAH desde onboarding y el user lo tiene null, lo guardamos
            if (tdahFromState && !user.tdahType) user.tdahType = tdahFromState;
          }
        }

        // si sigue sin existir, lo creamos
        if (!user) {
          const randomPass = crypto.randomBytes(32).toString("hex");
          const passwordHash = await argon2.hash(randomPass);

          user = await User.create({
            name,
            email,
            passwordHash,         // hash inaccesible, no hay clave local real
            googleId,
            authProvider: "google",
            role: "student",      // nunca creamos admin por Google
            tdahType: tdahFromState ?? null,
            lastLogin: now,
          });
        } else {
          user.lastLogin = now;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  ));

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id)
        .select({ _id: 1, role: 1, avatarUrl: 1 })
        .lean<{ _id: unknown; role: string; avatarUrl?: string | null } | null>();

      if (!user) {
        done(null, null);
        return;
      }

      const safeUser = {
        id: String(user._id),
        role: user.role,
        avatarUrl: typeof user.avatarUrl === "string" ? user.avatarUrl : null,
      };
      done(null, safeUser as any);
    } catch (err) {
      done(err as Error, null);
    }
  });
}
