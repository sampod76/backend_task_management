export type EmailProvider = 'aws-ses' | 'gmail';

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface SendEmailResult {
  success: boolean;
  provider: EmailProvider;
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  response?: string;
}
