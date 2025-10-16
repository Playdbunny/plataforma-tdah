import { Schema, model, models, Document } from "mongoose";
import argon2 from "argon2";

/** Tipos */
export type TDAHType = "inatento" | "hiperactivo" | "combinado" | null;
export type Role = "student" | "admin";

/** Lo que enviaremos al frontend (sin passwordHash) - Vista segura */
export interface IUserSafe {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  role: Role;
  tdahType: TDAHType;

  xp: number;
  coins: number;
  level: number;
  streak: { count: number; lastCheck?: Date | null };
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date | null;
}

/** Cómo luce el documento dentro de Mongo (incluye passwordHash) - Documento Real almacenado en Mongo */
export interface IUserDoc extends Document {
  // Campos básicos
  name: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  passwordHash: string;
  role: Role;
  tdahType: TDAHType;

  // Estadísticas de gamificación
  xp: number;
  coins: number;
  level: number;
  streak: { count: number; lastCheck?: Date | null };

  // Campos de auditoría
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Campos para recuperación de password
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;

  // Campos para OAuth con Google
  googleId?: string | null;
  authProvider?: "local" | "google";

  /** Métodos de instancia */
  verifyPassword(plain: string): Promise<boolean>; // Verifica si el password en texto plano coincide con el hash almacenado
  toSafe(): IUserSafe; // Convierte el documento a una vista segura (sin passwordHash)
}

/** Subdocumento para racha */
const StreakSchema = new Schema(
  {
    count: { type: Number, default: 0 },
    lastCheck: { type: Date, default: null }
  },
  { _id: false } // no queremos un _id para el subdocumento
);

/** Esquema de Usuario */
const UserSchema = new Schema<IUserDoc>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    
    email: { 
      type: String, 
      minlength: 5, 
      maxlength: 100,
      required: true,
      unique: true,       // índice único (Mongo lo creará)
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'] // Validación básica de email
    },

    username: { type: String, trim: true, minlength: 2, maxlength: 100, unique: true, sparse: true, index: true }, // puede ser null, pero si existe debe ser único
    avatarUrl: { type: String, default: null },

    // Nunca almacenamos el password en texto plano
    passwordHash: { type: String, required: true },

    // Acceso/Roles
    role: { type: String, enum: ["student", "admin"], default: "student", index: true },

    // TDAH elegido en onboarding, editable luego en /profile/edit
    tdahType: { type: String, enum: ["inatento", "hiperactivo", "combinado", null], default: null },

    // Estadísticas de gamificación
    xp: { type: Number, default: 0, index: true },
    coins: { type: Number, default: 0 },
    level: { type: Number, default: 0 },

    // Racha diaria
    streak: { type: StreakSchema, default: () => ({}) },

    lastLogin: { type: Date, default: null, index: true }, // para saber cuándo fue la última vez que se conectó

    // Campos para recuperación de password
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpiresAt: { type: Date, default: null },

    // Para usuarios que se registraron con Google OAuth
    googleId: { type: String, default: null, index: true },
    authProvider: { type: String, enum: ["local","google"], default: "local", index: true },
  },
  {
    timestamps: true, // createdAt, updatedAt automáticos
    versionKey: false, // deshabilitar __v
    toJSON: {
      virtuals: true,
      transform: (_doc: any, ret: any) => {
        // Agrega id legible si existe _id
        if (ret && ret._id) {
          ret.id = ret._id.toString?.();
          // Borrar usando Reflect evita el error ts2790
          Reflect.deleteProperty(ret, "_id");
        }
        // Nunca exponer el hash
        Reflect.deleteProperty(ret, "passwordHash");
        Reflect.deleteProperty(ret, "passwordResetTokenHash");
        Reflect.deleteProperty(ret, "passwordResetExpiresAt");
        return ret;
      }
    }
  }
);

/** Métodos de instancia */
UserSchema.methods.verifyPassword = function (plain: string) {
  return argon2.verify(this.passwordHash, plain);
};

UserSchema.methods.toSafe = function (): IUserSafe {
  // Usa el transform anterior (ya quita hash y setea id)
  const json = this.toJSON();
  return json as IUserSafe;
};

/** Métodos de instancia extra (por ahora comentados) */
// UserSchema.methods.addXp = async function (amount: number) {
//   const inc = Math.max(0, Math.floor(amount || 0));
//   if (!inc) return this;
//   await this.updateOne({ $inc: { xp: inc } });
//   this.xp += inc;
//   return this;
// };

// UserSchema.methods.checkInStreak = async function (date = new Date()) {
//   const last = this.streak?.lastCheck ? new Date(this.streak.lastCheck) : null;
//   const today = new Date(date);
//   today.setHours(0, 0, 0, 0);
//   if (!last) {
//     this.streak = { count: 1, lastCheck: today };
//   } else {
//     last.setHours(0, 0, 0, 0);
//     const diffDays = Math.round((+today - +last) / 86_400_000);
//     if (diffDays === 1) this.streak.count += 1;
//     else if (diffDays > 1) this.streak.count = 1;
//     this.streak.lastCheck = today;
//   }
//   await this.updateOne({ streak: this.streak });
//   return this;
// };


// Índice extra (consulta usuarios ordenados por xp dentro de cada rol)
UserSchema.index({ role: 1, xp: -1 });

export const User = models.User || model<IUserDoc>("User", UserSchema);