import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import {
  EmailProvider,
  SendEmailPayload,
  SendEmailResult,
} from './email.types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly provider: EmailProvider;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.getEmailProvider();
    this.transporter = this.createTransporter(this.provider);
  }

  getProvider(): EmailProvider {
    return this.provider;
  }

  private getEmailProvider(): EmailProvider {
    const provider = this.configService.get<string>(
      'EMAIL_PROVIDER',
      'aws-ses',
    );

    if (provider !== 'aws-ses' && provider !== 'gmail') {
      throw new Error(
        `Invalid EMAIL_PROVIDER="${provider}". Allowed values: aws-ses | gmail`,
      );
    }

    return provider;
  }

  private createTransporter(provider: EmailProvider): Transporter {
    if (provider === 'gmail') {
      return this.createGmailTransporter();
    }

    return this.createAwsSesTransporter();
  }

  private createAwsSesTransporter(): Transporter {
    return nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('AWS_SES_HOST'),
      port: Number(this.configService.get<string>('AWS_SES_PORT', '587')),
      secure:
        this.configService.get<string>('AWS_SES_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.getOrThrow<string>('AWS_SES_SMTP_USER_NAME'),
        pass: this.configService.getOrThrow<string>('AWS_SES_SMTP_PASSWORD'),
      },
    });
  }

  private createGmailTransporter(): Transporter {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.getOrThrow<string>('NODEMAILER_AUTH_EMAIL'),
        pass: this.configService.getOrThrow<string>('NODEMAILER_AUTH_PASS'),
      },
    });
  }

  private getDefaultSenderEmail(): string {
    if (this.provider === 'gmail') {
      return (
        this.configService.get<string>('GMAIL_SENDER_EMAIL') ??
        this.configService.getOrThrow<string>('NODEMAILER_AUTH_EMAIL')
      );
    }

    return this.configService.getOrThrow<string>('DEFAULT_SENDER_EMAIL');
  }

  async sendMail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const from = payload.from ?? this.getDefaultSenderEmail();

    const result = await this.transporter.sendMail({
      from,
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      replyTo: payload.replyTo,
      subject: payload.subject,
      text: payload.text,
      html: payload.html ?? payload.text,
      attachments: payload.attachments,
    });

    this.logger.log(
      `Email sent provider=${this.provider} messageId=${result.messageId}`,
    );

    return {
      success: true,
      provider: this.provider,
      messageId: result.messageId,
      accepted: result.accepted as string[],
      rejected: result.rejected as string[],
      response: result.response,
    };
  }

  async verifyConnection(): Promise<boolean> {
    return this.transporter.verify();
  }
}
