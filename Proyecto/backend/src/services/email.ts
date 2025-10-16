import nodemailer, { Transporter } from "nodemailer";

export interface PasswordResetEmailParams {
  to: string;
  resetUrl: string;
  name?: string | null;
}

export interface PasswordResetEmailResult {
  previewUrl?: string;
  messageId?: string;
}

let cachedTransporterPromise: Promise<Transporter> | null = null;
let fallbackFromAddress: string | null = null;

async function resolveTransporter(): Promise<Transporter> {
  if (cachedTransporterPromise) return cachedTransporterPromise;

  cachedTransporterPromise = (async () => {
    const smtpUrl = process.env.SMTP_URL;
    if (smtpUrl) {
      return nodemailer.createTransport(smtpUrl);
    }

    const host = process.env.SMTP_HOST;
    if (host) {
      const port = Number(process.env.SMTP_PORT ?? 587);
      const secureEnv = process.env.SMTP_SECURE;
      const secure = secureEnv ? secureEnv === "true" || secureEnv === "1" : port === 465;

      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
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
    fallbackFromAddress ||
    "no-reply@plataforma-tdah.com"
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

  const info = await transporter.sendMail({
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