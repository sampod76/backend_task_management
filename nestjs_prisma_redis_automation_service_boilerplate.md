# NestJS + Prisma + Redis + Automation Service

এই boilerplate-এ আছে:
- NestJS API service
- Prisma + PostgreSQL
- Red([docs.nestjs.com](https://docs.nestjs.com/techniques/queues?utm_source=chatgpt.com))- Automation module
- Audit log save
- Email/notification job handling

---

## 1) Project Structure

```bash
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   └── redis/
│       └── bullmq.module.ts
├── config/
│   └── env.ts
├── modules/
│   ├── automation/
│   │   ├── automation.module.ts
│   │   ├── automation.queue.ts
│   │   ├── processors/
│   │   │   └── automation.processor.ts
│   │   ├── services/
│   │   │   ├── automation.service.ts
│   │   │   ├── audit.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── rule-engine.service.ts
│   │   ├── dto/
│   │   │   └── automation-event.dto.ts
│   │   └── types/
│   │       └── automation-event.type.ts
│   └── users/
│       ├── users.module.ts
│       ├── users.controller.ts
│       └── users.service.ts
prisma/
├── schema.prisma
├── migrations/
│   └── ...
├── seed.ts
Dockerfile
docker-compose.yml
package.json
.env.example
```

---

## 2) package.json

```json
{
  "name": "nestjs-prisma-redis-automation-service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "prisma:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/bullmq": "^11.0.0",
    "@prisma/client": "^6.0.0",
    "bullmq": "^5.0.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "ioredis": "^5.4.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/node": "^22.0.0",
    "prisma": "^6.0.0",
    "ts-node": "^10.9.2",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## 3) .env.example

```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/automation_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

## 4) docker-compose.yml

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16
    container_name: automation_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: automation_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: automation_redis
    restart: unless-stopped
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## 5) prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum AutomationEventType {
  USER_UPDATED
  USER_CREATED
  BOOKING_CONFIRMED
}

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AuditLog {
  id           String              @id @default(uuid())
  eventType    AutomationEventType
  entity       String
  entityId     String
  actorId      String?
  actorType    String?
  description  String?
  oldData      Json?
  newData      Json?
  metadata     Json?
  createdAt    DateTime            @default(now())

  @@index([entity, entityId])
  @@index([eventType])
  @@index([createdAt])
}
```

---

## 6) prisma/seed.ts

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@example.com',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

---

## 7) src/config/env.ts

```ts
export default () => ({
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },
});
```

---

## 8) src/main.ts

```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT || 4000);
  console.log(`Server running on http://localhost:${process.env.PORT || 4000}`);
}

bootstrap();
```

---

## 9) src/app.module.ts

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import env from './config/env';
import { PrismaModule } from './common/prisma/prisma.module';
import { BullMqModule } from './common/redis/bullmq.module';
import { UsersModule } from './modules/users/users.module';
import { AutomationModule } from './modules/automation/automation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [env],
    }),
    PrismaModule,
    BullMqModule,
    UsersModule,
    AutomationModule,
  ],
})
export class AppModule {}
```

---

## 10) src/common/prisma/prisma.service.ts

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

---

## 11) src/common/prisma/prisma.module.ts

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

---

## 12) src/common/redis/bullmq.module.ts

```ts
import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      },
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 100,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
      },
    }),
  ],
  exports: [BullModule],
})
export class BullMqModule {}
```

---

## 13) src/modules/automation/types/automation-event.type.ts

```ts
import { AutomationEventType } from '@prisma/client';

export interface AutomationEventPayload {
  eventType: AutomationEventType;
  entity: string;
  entityId: string;
  actorId?: string;
  actorType?: string;
  description?: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}
```

---

## 14) src/modules/automation/dto/automation-event.dto.ts

```ts
import { AutomationEventType } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class AutomationEventDto {
  @IsEnum(AutomationEventType)
  eventType!: AutomationEventType;

  @IsString()
  entity!: string;

  @IsString()
  entityId!: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  actorType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  oldData?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  newData?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
```

---

## 15) src/modules/automation/automation.queue.ts

```ts
export const AUTOMATION_QUEUE = 'automation-queue';
export const AUTOMATION_JOB = 'process-automation-event';
```

---

## 16) src/modules/automation/services/audit.service.ts

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AutomationEventPayload } from '../types/automation-event.type';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async saveLog(payload: AutomationEventPayload) {
    return this.prisma.auditLog.create({
      data: {
        eventType: payload.eventType,
        entity: payload.entity,
        entityId: payload.entityId,
        actorId: payload.actorId,
        actorType: payload.actorType,
        description: payload.description,
        oldData: payload.oldData,
        newData: payload.newData,
        metadata: payload.metadata,
      },
    });
  }
}
```

---

## 17) src/modules/automation/services/email.service.ts

```ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send(to: string, subject: string, body: string) {
    this.logger.log(`Email => to=${to}, subject=${subject}, body=${body}`);
    return true;
  }
}
```

---

## 18) src/modules/automation/services/notification.service.ts

```ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async send(userId: string, title: string, message: string) {
    this.logger.log(`Notification => userId=${userId}, title=${title}, message=${message}`);
    return true;
  }
}
```

---

## 19) src/modules/automation/services/rule-engine.service.ts

```ts
import { Injectable, Logger } from '@nestjs/common';
import { AutomationEventType } from '@prisma/client';
import { AutomationEventPayload } from '../types/automation-event.type';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async process(payload: AutomationEventPayload) {
    switch (payload.eventType) {
      case AutomationEventType.USER_UPDATED:
        await this.handleUserUpdated(payload);
        break;

      case AutomationEventType.USER_CREATED:
        await this.handleUserCreated(payload);
        break;

      case AutomationEventType.BOOKING_CONFIRMED:
        await this.handleBookingConfirmed(payload);
        break;

      default:
        this.logger.warn(`No rule found for event: ${payload.eventType}`);
    }
  }

  private async handleUserUpdated(payload: AutomationEventPayload) {
    const email = payload.newData?.['email'];
    if (typeof email === 'string') {
      await this.emailService.send(
        email,
        'Profile updated',
        'Your profile has been updated successfully.',
      );
    }

    if (payload.actorId) {
      await this.notificationService.send(
        payload.actorId,
        'User updated',
        `Entity ${payload.entity} with id ${payload.entityId} was updated.`,
      );
    }
  }

  private async handleUserCreated(payload: AutomationEventPayload) {
    const email = payload.newData?.['email'];
    if (typeof email === 'string') {
      await this.emailService.send(
        email,
        'Welcome',
        'Your account has been created successfully.',
      );
    }
  }

  private async handleBookingConfirmed(payload: AutomationEventPayload) {
    const email = payload.metadata?.['email'];
    if (typeof email === 'string') {
      await this.emailService.send(
        email,
        'Booking confirmed',
        'Your booking has been confirmed.',
      );
    }
  }
}
```

---

## 20) src/modules/automation/services/automation.service.ts

```ts
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AUTOMATION_JOB, AUTOMATION_QUEUE } from '../automation.queue';
import { AutomationEventPayload } from '../types/automation-event.type';

@Injectable()
export class AutomationService {
  constructor(
    @InjectQueue(AUTOMATION_QUEUE)
    private readonly automationQueue: Queue,
  ) {}

  async publish(payload: AutomationEventPayload) {
    await this.automationQueue.add(AUTOMATION_JOB, payload, {
      jobId: `${payload.eventType}:${payload.entity}:${payload.entityId}:${Date.now()}`,
    });

    return {
      success: true,
      message: 'Automation event published successfully',
    };
  }
}
```

---

## 21) src/modules/automation/processors/automation.processor.ts

```ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AUTOMATION_QUEUE } from '../automation.queue';
import { AutomationEventPayload } from '../types/automation-event.type';
import { AuditService } from '../services/audit.service';
import { RuleEngineService } from '../services/rule-engine.service';

@Processor(AUTOMATION_QUEUE)
export class AutomationProcessor extends WorkerHost {
  constructor(
    private readonly auditService: AuditService,
    private readonly ruleEngineService: RuleEngineService,
  ) {
    super();
  }

  async process(job: Job<AutomationEventPayload>) {
    const payload = job.data;

    await this.auditService.saveLog(payload);
    await this.ruleEngineService.process(payload);

    return {
      success: true,
      processedAt: new Date().toISOString(),
      jobId: job.id,
    };
  }
}
```

---

## 22) src/modules/automation/automation.module.ts

```ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AUTOMATION_QUEUE } from './automation.queue';
import { AutomationService } from './services/automation.service';
import { AuditService } from './services/audit.service';
import { EmailService } from './services/email.service';
import { NotificationService } from './services/notification.service';
import { RuleEngineService } from './services/rule-engine.service';
import { AutomationProcessor } from './processors/automation.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: AUTOMATION_QUEUE,
    }),
  ],
  providers: [
    AutomationService,
    AuditService,
    EmailService,
    NotificationService,
    RuleEngineService,
    AutomationProcessor,
  ],
  exports: [AutomationService],
})
export class AutomationModule {}
```

---

## 23) src/modules/users/users.service.ts

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { AutomationEventType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AutomationService } from '../automation/services/automation.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly automationService: AutomationService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(id: string, data: { name?: string; email?: string }, actorId?: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
    });

    await this.automationService.publish({
      eventType: AutomationEventType.USER_UPDATED,
      entity: 'User',
      entityId: updatedUser.id,
      actorId,
      actorType: 'USER',
      description: 'User profile updated',
      oldData: {
        name: existingUser.name,
        email: existingUser.email,
      },
      newData: {
        name: updatedUser.name,
        email: updatedUser.email,
      },
      metadata: {
        source: 'users-service',
      },
    });

    return updatedUser;
  }

  async createUser(data: { name: string; email: string }, actorId?: string) {
    const user = await this.prisma.user.create({
      data,
    });

    await this.automationService.publish({
      eventType: AutomationEventType.USER_CREATED,
      entity: 'User',
      entityId: user.id,
      actorId,
      actorType: 'USER',
      description: 'New user created',
      newData: {
        name: user.name,
        email: user.email,
      },
      metadata: {
        source: 'users-service',
      },
    });

    return user;
  }
}
```

---

## 24) src/modules/users/users.controller.ts

```ts
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      email: string;
      actorId?: string;
    },
  ) {
    return this.usersService.createUser(
      {
        name: body.name,
        email: body.email,
      },
      body.actorId,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      actorId?: string;
    },
  ) {
    return this.usersService.updateUser(
      id,
      {
        name: body.name,
        email: body.email,
      },
      body.actorId,
    );
  }
}
```

---

## 25) src/modules/users/users.module.ts

```ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

---

## 26) How to Run

```bash
cp .env.example .env

docker compose up -d
pnpm install
pnpm prisma:generate
pnpm prisma:migrate --name init
pnpm prisma:seed
pnpm start:dev
```

---

## 27) Test API

### Create user

```http
POST /users
Content-Type: application/json

{
  "name": "Iblossom",
  "email": "iblossom@example.com",
  "actorId": "admin-1"
}
```

### Update user

```http
PATCH /users/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "updated@example.com",
  "actorId": "admin-1"
}
```

---

## 28) What happens after update?

1. User updated in PostgreSQL
2. Event published to BullMQ queue
3. Processor consumes the job
4. Audit log saved in `AuditLog`
5. Rule engine decides what to do
6. Email and notification are triggered

---

## 29) Next upgrade path

- real email provider (SES / SMTP)
- websocket notification
- dead letter queue
- rate limit for spammy events
- rule config in database
- separate automation microservice app
- requestId / ip / userAgent tracking

---

## 30) Important note

এই project এখন **single NestJS app** আকারে দেয়া হয়েছে যাতে সহজে বুঝতে পারো। পরে চাইলে এটা দুই app-এ ভাগ করা যাবে:
- main-api
- automation-worker

একই Redis queue use করে আলাদা process হিসেবে run করবে।

