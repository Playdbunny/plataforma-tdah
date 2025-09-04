import { Schema, model } from 'mongoose';

export type TDAHType = "inatento" | "hiperactivo" | "combinado" | null;
export type RoleType = "student" | "admin";

const userSchema = new Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  avatar:       { type: String },
  xp:           { type: Number, default: 0 },
  coins:        { type: Number, default: 0 },
  tdahType:     { type: String, enum: ["inatento","hiperactivo","combinado", null], default: null },
  role:         { type: String, enum: ["admin","student"], default: "student" }
}, { timestamps: true });

export const User = model("User", userSchema);