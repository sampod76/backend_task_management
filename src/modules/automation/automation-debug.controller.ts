import { Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/errors';
import { AppConfig } from '../../config/app.config';
import { AutomationQueueProducer } from './services/automation-queue.producer';

@Controller('automation/debug')
export class AutomationDebugController {
  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly producer: AutomationQueueProducer,
  ) {}

  @Post('test-job')
  async publishTestJob() {
    const app = this.configService.getOrThrow('app', { infer: true });

    if (app.isProduction) {
      throw AppException.notFound();
    }

    const job = await this.producer.testJobEnqueue();

    return {
      queue: job.queueName,
      jobName: job.name,
      jobId: job.id,
    };
  }
}
