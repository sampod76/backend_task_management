import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AutomationQueueProducer } from './modules/automation/services/automation-queue.producer';

async function bootstrap() {
  const logger = new Logger('QueueTestPublisher');
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  try {
    const producer = app.get(AutomationQueueProducer);
    const job = await producer.testJobEnqueue();

    logger.log(
      JSON.stringify({
        message: 'Published automation test job',
        queue: job.queueName,
        jobName: job.name,
        jobId: job.id,
      }),
    );
  } finally {
    await app.close();
  }
}

void bootstrap();
