// ============================================================
// studentsStore.ts — Mock de estudiantes con Zustand + persist
// ============================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Tipo de TDAH que ya usas en tu app
export type TDAHType = "inatento" | "hiperactivo" | "combinado" | null;

// Estructura base del estudiante en el admin
export type Student = {
  id: string;
  name: string;
  email: string;
  tdahType: TDAHType;
  xp: number;                 // XP total
  streakDays?: number;        // racha en días (opcional)
  lastActiveAt?: string;      // ISO
  progressBySubject?: {       // progreso por materia (0-100)
    slug: string;
    label: string;
    progress: number;
  }[];
  weeklyXP?: number[];        // XP por día de la semana [L..D]
  recentActivity?: string[];  // feed plano de eventos (mock)
  avatarUrl?: string;         // para la vista detalle
};

// Semilla de demo (puedes adaptar a tus nombres)
const SEED: Student[] = [
  {
    id: "u1",
    name: "Ana Torres",
    email: "anatorres@gmail.com",
    tdahType: "inatento",
    xp: 850,
    streakDays: 2,
    lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // hace 2h
    progressBySubject: [
      { slug: "matematicas", label: "Matemáticas", progress: 51 },
      { slug: "historia", label: "Historia", progress: 71 },
      { slug: "quimica", label: "Química", progress: 15 },
    ],
    weeklyXP: [20, 28, 25, 35, 36, 42, 50],
    recentActivity: [
      "Completó ejercicio en Matemáticas (+20 XP)",
      'Vio material "Guía Química"',
      "Inició sesión (hace 2h)",
    ],
    avatarUrl: "/Images/default-profile.jpg",
  },
  {
    id: "u2",
    name: "Juan Pérez",
    email: "juanperez@gmail.com",
    tdahType: "hiperactivo",
    xp: 800,
    streakDays: 3,
    lastActiveAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    progressBySubject: [
      { slug: "matematicas", label: "Matemáticas", progress: 58 },
      { slug: "historia", label: "Historia", progress: 65 },
      { slug: "quimica", label: "Química", progress: 22 },
    ],
    weeklyXP: [12, 15, 18, 25, 30, 31, 40],
    recentActivity: ["Terminó Historia (85%)", "Sumó 30 XP en Química"],
    avatarUrl: "/Images/default-profile.jpg",
  },
  {
    id: "u3",
    name: "Pedro Rojas",
    email: "projas@gmail.com",
    tdahType: "combinado",
    xp: 650,
    streakDays: 1,
    lastActiveAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    progressBySubject: [
      { slug: "matematicas", label: "Matemáticas", progress: 35 },
      { slug: "historia", label: "Historia", progress: 49 },
      { slug: "quimica", label: "Química", progress: 12 },
    ],
    weeklyXP: [8, 10, 12, 18, 20, 22, 28],
    recentActivity: ["Inició sesión (hace 6h)"],
    avatarUrl: "/Images/default-profile.jpg",
  },
];

type StudentsState = {
  items: Student[];
  loading: boolean;
  error: string | null;

  list: () => Promise<void>;          // en backend real → GET /students
  getById: (id: string) => Student | undefined;
};

export const useStudentsStore = create<StudentsState>()(
  persist(
    (set, get) => ({
      items: SEED,
      loading: false,
      error: null,

      list: async () => {
        set({ loading: true, error: null });
        try {
          // Simula latencia en demo
          await new Promise((r) => setTimeout(r, 150));
          // Backend real: const data = await fetch(...).then(r=>r.json()); set({items:data})
        } catch (e) {
          set({ error: "No se pudo obtener estudiantes" });
        } finally {
          set({ loading: false });
        }
      },

      getById: (id) => get().items.find((s) => s.id === id),
    }),
    { name: "students-store" }
  )
);
