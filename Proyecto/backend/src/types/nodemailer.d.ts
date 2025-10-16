declare module "nodemailer" {
  export interface SentMessageInfo {
    messageId?: string;
    [key: string]: unknown;
  }

  export interface SendMailOptions {
    to?: string;
    from?: string;
    subject?: string;
    text?: string;
    html?: string;
    [key: string]: unknown;
  }

  export interface TestAccount {
    user: string;
    pass: string;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
    };
  }

  export interface Transporter {
    sendMail(mail: SendMailOptions): Promise<SentMessageInfo>;
  }

  export function createTransport(options: unknown): Transporter;
  export function createTestAccount(): Promise<TestAccount>;
  export function getTestMessageUrl(info: SentMessageInfo): string | false;
}