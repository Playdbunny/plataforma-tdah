type SendMailInput = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
};

type SendMailResult = {
  messageId?: string;
  [key: string]: unknown;
};

type NodemailerTransporter = {
  sendMail: (input: SendMailInput) => Promise<SendMailResult>;
};

type NodemailerModule = {
  createTransport: (options: unknown) => NodemailerTransporter;
  getTestMessageUrl?: (info: SendMailResult) => string | false | null | undefined;
};

export interface PasswordResetEmailParams {
  to: string;
  resetUrl: string;
  name?: string | null;
}

export interface PasswordResetEmailResult {
  simulated?: boolean;
  previewUrl?: string;
  messageId?: string;
}

let cachedModule: NodemailerModule | null | undefined;
let cachedTransporter: NodemailerTransporter | null | undefined;

function isModuleNotFound(error: unknown): error is NodeJS.ErrnoException {
  if (!error || typeof error !== "object") return false;
  return (error as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND";
}

function loadNodemailer(): NodemailerModule | null {
  if (cachedModule !== undefined) return cachedModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedModule = require("nodemailer") as NodemailerModule;
  } catch (error) {
    if (isModuleNotFound(error)) {
      console.warn(
        "[email] nodemailer no está instalado. El envío de correos se simulará hasta que agregues la dependencia.",
      );
      cachedModule = null;
    } else {
      throw error;
    }
  }

  return cachedModule;
}

function resolveTransporter(): NodemailerTransporter | null {
  if (cachedTransporter !== undefined) return cachedTransporter;

  const nodemailer = loadNodemailer();
  if (!nodemailer) {
    cachedTransporter = null;
    return cachedTransporter;
  }

  const smtpUrl = process.env.SMTP_URL;
  if (smtpUrl) {
    cachedTransporter = nodemailer.createTransport(smtpUrl);
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  if (!host) {
    cachedTransporter = null;
    return cachedTransporter;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secureEnv = process.env.SMTP_SECURE;
  const secure = secureEnv ? secureEnv === "true" || secureEnv === "1" : port === 465;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  return cachedTransporter;
}

function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "no-reply@plataforma-tdah.com"
  );
}

export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams,
): Promise<PasswordResetEmailResult> {
  const transporter = resolveTransporter();
  const nodemailer = loadNodemailer();
  const from = getFromAddress();
  const { to, resetUrl } = params;
  const name = params.name?.trim();

  const greeting = name && name.length > 0 ? `Hola ${name},` : "Hola,";

  const text = `${greeting}\n\n` +
    `Recibimos una solicitud para restablecer tu contraseña en Plataforma TDAH.\n` +
    `Haz clic en el siguiente enlace (o cópialo en tu navegador) para crear una nueva contraseña:\n\n` +
    `${resetUrl}\n\n` +
    `Si no fuiste tú, simplemente ignora este correo.\n` +
    `El enlace expirará en unas horas por seguridad.`;

  const html = `
    <p>${greeting}</p>
    <p>Recibimos una solicitud para restablecer tu contraseña en <strong>Plataforma TDAH</strong>.</p>
    <p>
      Haz clic en el siguiente botón (o copia el enlace en tu navegador) para crear una nueva contraseña:
    </p>
    <p>
      <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="
        background-color:#06b6d4;
        color:#ffffff;
        padding:12px 20px;
        border-radius:8px;
        text-decoration:none;
        display:inline-block;
        font-weight:600;
      ">
        Restablecer contraseña
      </a>
    </p>
    <p style="margin-top:16px;word-break:break-word;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
      <a href="${resetUrl}" target="_blank" rel="noopener noreferrer">${resetUrl}</a>
    </p>
    <p style="margin-top:16px;">
      Si no solicitaste este cambio, puedes ignorar este correo. El enlace expirará en unas horas por seguridad.
    </p>
    <p style="margin-top:16px;">— El equipo de Plataforma TDAH</p>
  `;

  if (!transporter) {
    console.warn("[email] SMTP no configurado. Simulando envío de correo de recuperación.");
    console.info(`[email] Enlace de restablecimiento para ${to}: ${resetUrl}`);
    return { simulated: true };
  }

  const info = await transporter.sendMail({
    to,
    from,
    subject: "Recupera tu contraseña",
    text,
    html,
  });

  const previewCandidate = nodemailer?.getTestMessageUrl?.(info);
  const previewUrl = typeof previewCandidate === "string" ? previewCandidate : undefined;
  if (previewUrl) {
    console.info(`[email] Vista previa del correo de recuperación: ${previewUrl}`);
  }

  return { messageId: info.messageId, previewUrl };
}