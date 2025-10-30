import nodemailer from "nodemailer";
import type {
  Transporter,
  SentMessageInfo,
  SendMailOptions,
} from "nodemailer";

// Parámetros para el correo de restablecimiento de contraseña
export interface PasswordResetEmailParams {
  to: string;
  resetUrl: string;
  name?: string | null;
}

// Resultado del envío del correo de restablecimiento de contraseña
export interface PasswordResetEmailResult {
  previewUrl?: string;
  messageId?: string;
}

// Función para enviar el correo de restablecimiento de contraseña
let cachedTransporterPromise: Promise<Transporter> | null = null;
let fallbackFromAddress: string | null = null;

// Retorna la cantidad máxima de intentos para el envío de correos
function resolveMaxEmailAttempts(): number {
  const raw = process.env.SMTP_MAX_RETRIES;
  if (!raw) return 3;

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    console.warn(
      `[email] Valor inválido para SMTP_MAX_RETRIES="${raw}". Se usará el valor predeterminado (3).`,
    );
    return 3;
  }

  return parsed;
}

// Retorna el retraso inicial entre reintentos en milisegundos
function resolveRetryDelay(): number {
  const raw = process.env.SMTP_RETRY_DELAY_MS;
  if (!raw) return 2_000;

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    console.warn(
      `[email] Valor inválido para SMTP_RETRY_DELAY_MS="${raw}". Se usará el valor predeterminado (2000ms).`,
    );
    return 2_000;
  }

  return parsed;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Envía un correo con reintentos en caso de error temporal
async function sendMailWithRetry(
  transporter: Transporter,
  options: SendMailOptions,
): Promise<SentMessageInfo> {
  const maxAttempts = resolveMaxEmailAttempts();
  const baseDelay = resolveRetryDelay();

  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await transporter.sendMail(options);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) {
        break;
      }

      const delay = baseDelay * attempt;
      console.warn(
        `[email] Falló el envío (intento ${attempt}/${maxAttempts}). Reintentando en ${delay}ms...`,
        error,
      );
      await sleep(delay);
    }
  }

  console.error("[email] Falló el envío tras agotar los reintentos.", lastError);
  throw lastError instanceof Error ? lastError : new Error("Falló el envío de correo");
}

// Analiza un valor de cadena como booleano, con un valor predeterminado
function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (typeof value === "undefined") return fallback;
  return value === "true" || value === "1";
}

// Resuelve las credenciales de Gmail desde las variables de entorno
function resolveGmailCredentials() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

  if (user && pass) {
    return { user, pass };
  }

  return null;
}

// Resuelve el transportador de correo electrónico basado en la configuración
async function resolveTransporter(): Promise<Transporter> {
  if (cachedTransporterPromise) return cachedTransporterPromise;

  // Inicializa el transportador de correo electrónico
  cachedTransporterPromise = (async () => {
    const smtpUrl = process.env.SMTP_URL;
    if (smtpUrl) {
      return nodemailer.createTransport(smtpUrl);
    }

    const preferGmail = parseBoolean(process.env.SMTP_USE_GMAIL, false);
    const gmailAuth = resolveGmailCredentials();

    if (preferGmail || gmailAuth) {
      if (!gmailAuth) {
        console.warn("[email] SMTP_USE_GMAIL está activo pero faltan credenciales.");
      } else {
        return nodemailer.createTransport({
          service: "gmail",
          auth: gmailAuth,
        });
      }
    }
    const host = process.env.SMTP_HOST;
    if (host) {
      const port = Number(process.env.SMTP_PORT ?? 587);
      const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);

      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
      });
    }

    if (gmailAuth) {
      return nodemailer.createTransport({
        service: "gmail",
        auth: gmailAuth,
      });
    }

    const testAccount = await nodemailer.createTestAccount();
    fallbackFromAddress = testAccount.user;
    console.warn(
      "[email] SMTP no configurado. Se utilizará una cuenta de prueba de Nodemailer.",
    );
    console.warn(`[email] Credenciales temporales: ${testAccount.user}`);

    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  })();

  return cachedTransporterPromise;
}

function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    fallbackFromAddress ||
    "synapquest@gmail.com"
  );
}

export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams,
): Promise<PasswordResetEmailResult> {
  const transporter = await resolveTransporter();
  const from = getFromAddress();
  const { to, resetUrl } = params;
  const name = params.name?.trim();

  const greeting = name && name.length > 0 ? `Hola ${name},` : "Hola,";

  const text = `${greeting}\n\n` +
    `Recibimos una solicitud para restablecer tu contraseña en SynapQuest.\n` +
    `Haz clic en el siguiente enlace (o cópialo en tu navegador) para crear una nueva contraseña:\n\n` +
    `${resetUrl}\n\n` +
    `Si no fuiste tú, simplemente ignora este correo.\n` +
    `El enlace expirará en unas horas por seguridad.`;

  const html = `
    <p>${greeting}</p>
    <p>Recibimos una solicitud para restablecer tu contraseña en <strong>SynapQuest</strong>.</p>
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
    <p style="margin-top:16px;">— El equipo de SynapQuest</p>
  `;

  const info = await sendMailWithRetry(transporter, {
    to,
    from,
    subject: "Recupera tu contraseña",
    text,
    html,
  });

  const previewCandidate = nodemailer.getTestMessageUrl?.(info);
  const previewUrl = typeof previewCandidate === "string" ? previewCandidate : undefined;
  if (previewUrl) {
    console.info(`[email] Vista previa del correo de recuperación: ${previewUrl}`);
  }

  return { messageId: info.messageId, previewUrl };
}