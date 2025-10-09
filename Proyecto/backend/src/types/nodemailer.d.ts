declare module "nodemailer" {
  export interface SentMessageInfo {
    messageId?: string;
    [key: string]: unknown;
  }

  export interface Transporter<TSentMessageInfo = SentMessageInfo> {
    sendMail(mailOptions: {
      to: string;
      from?: string;
      subject?: string;
      text?: string;
      html?: string;
      [key: string]: unknown;
    }): Promise<TSentMessageInfo>;
  }

  export function createTransport(options: unknown): Transporter;
  export function getTestMessageUrl(info: SentMessageInfo): string | false | null | undefined;
}