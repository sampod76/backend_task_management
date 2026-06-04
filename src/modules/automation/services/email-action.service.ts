import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../../../common/lib/email/email.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  AutomationEvent,
  EmailActionConfig,
} from '../types/automation-event.type';
import { ServiceName } from '../../../common/constants/automation';

@Injectable()
export class EmailActionService {
  private readonly logger = new Logger(EmailActionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async send(
    action: EmailActionConfig,
    event: AutomationEvent,
    context?: { serviceName?: ServiceName },
  ) {
    const serviceName = context?.serviceName ?? event.serviceName;

    const emailLog = await this.prisma.client.emailLog.create({
      data: {
        to: action.to,
        subject: action.subject,
        body: action.body,
        serviceName,
        provider: this.emailService.getProvider(),
        status: 'PENDING',
      },
    });

    try {
      const result = await this.emailService.sendMail({
        to: action.to,
        from: action.from,
        cc: action.cc,
        bcc: action.bcc,
        subject: action.subject,
        html: action.body,
        text: action.body,
      });

      this.logger.log(
        JSON.stringify({
          message: 'Email sent',
          provider: result.provider,
          to: action.to,
          subject: action.subject,
          eventId: event.eventId,
          serviceName,
        }),
      );

      await this.prisma.client.emailLog.update({
        where: {
          id_serviceName: { id: emailLog.id, serviceName },
        },
        data: {
          status: 'SENT',
          provider: result.provider,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await this.prisma.client.emailLog.update({
        where: {
          id_serviceName: { id: emailLog.id, serviceName },
        },
        data: {
          status: 'FAILED',
          error: message,
        },
      });

      this.logger.error(
        JSON.stringify({
          message: 'Email failed',
          provider: this.emailService.getProvider(),
          to: action.to,
          subject: action.subject,
          eventId: event.eventId,
          serviceName,
          error: message,
        }),
      );

      throw error;
    }
  }
}
