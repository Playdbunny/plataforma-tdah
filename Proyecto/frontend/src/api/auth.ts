import api from "../Lib/api";

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export async function requestPasswordReset(payload: ForgotPasswordPayload): Promise<void> {
  await api.post("/auth/forgot-password", payload);
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await api.post("/auth/reset-password", payload);
}