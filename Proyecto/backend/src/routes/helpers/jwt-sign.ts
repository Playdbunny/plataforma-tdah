import jwt, { Secret, SignOptions } from "jsonwebtoken";

type Expires = NonNullable<SignOptions["expiresIn"]>;
function getExpiresIn(): Expires {
  const v = process.env.JWT_EXPIRES;
  if (!v) return "7d" as Expires;
  const n = Number(v);
  return Number.isFinite(n) ? n : (v as Expires);
}

export function signToken(payload: object): string {
  const secretEnv = process.env.JWT_SECRET;
  if (!secretEnv) throw new Error("JWT_SECRET is missing");
  const secret: Secret = secretEnv;
  return jwt.sign(payload, secret, { expiresIn: getExpiresIn() });
}
