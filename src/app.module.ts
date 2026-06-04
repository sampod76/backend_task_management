import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfig, appConfig } from './config/app.config';

import { PrismaModule } from './database/prisma.module';

import { FilesModule } from './modules/files/files.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { BullMqModule } from './common/lib/queue/bullmq.module';
import { AutomationModule } from './modules/automation/automation.module';
import { RuleModule } from './modules/rule/rule.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { NotificationLogModule } from './modules/notification-log/notification-log.module';
import { QueueObservabilityModule } from './common/lib/queue/queue-observability.module';

@Module({
  imports: [
    ConfigModule.forRoot<AppConfig>({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig],
      cache: true, // প্রথমবার resolve করে config memory-তে cache রাখে (fast + immutable)
      expandVariables: false, // ENV variable interpolation বন্ধ রাখে (explicit + secure) example: ${PORT}
    }),

    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => ({
        secret: configService.getOrThrow('app.jwt.access_secret', {
          infer: true,
        }),
        signOptions: {
          expiresIn: configService.getOrThrow('app.jwt.expiresIn', {
            infer: true,
          }),
        },
      }),
    }),

    PrismaModule,

    AuthModule,

    UserModule,
    AdminModule,
    FilesModule,
    //
    BullMqModule,
    AutomationModule,
    RuleModule,
    AuditLogModule,
    NotificationLogModule,
    QueueObservabilityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: LoggingInterceptor,
    // },
  ],
})
export class AppModule {}
