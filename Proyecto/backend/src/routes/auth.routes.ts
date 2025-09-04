import { Router } from 'express';
import { User } from '../models/User';
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { z } from "zod";

const router = Router();

const tdahEnum = z.enum(["inatento","hiperactivo","combinado"]);

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  tdahType: tdahEnum.nullable().optional()  // ⬅️ opcional y puede ser null
});