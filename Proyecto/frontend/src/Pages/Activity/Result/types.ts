import type { FinishResult } from "../Plantillas/useActivityCompletion";

export interface AnswerReview {
  prompt: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number;
}

export interface ActivityResultState {
  activityId: string;
  activityTitle: string;
  subjectSlug?: string | null;
  backTo: string;
  summary: FinishResult;
  answers?: AnswerReview[];
}
