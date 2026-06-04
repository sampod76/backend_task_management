import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationLogService } from './notification-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLE } from '../user/user.types';
import {
  NotificationLogQueryFilter,
  NotificationLogQueryFilterSchema,
} from './schema/notification-log.filter.schema';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { AuthPayload } from '../auth/auth.types';
import { ServiceName } from '../../common/constants/automation';

@Controller('notification-log')
@Roles(ROLE.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationLogController {
  constructor(
    private readonly notificationLogService: NotificationLogService,
  ) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(NotificationLogQueryFilterSchema))
    query: NotificationLogQueryFilter,
    @CurrentUser() user: AuthPayload,
  ) {
    const result = await this.notificationLogService.findAll(query, user);

    return result;
  }

  @Get(':id/:serviceName')
  findOne(
    @Param('id') id: string,
    @Param('serviceName') serviceName: ServiceName,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.notificationLogService.findOne(id, serviceName, user);
  }

  @Patch(':id/:serviceName/read')
  markAsRead(
    @Param('id') id: string,
    @Param('serviceName') serviceName: ServiceName,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.notificationLogService.markAsRead(id, serviceName, user);
  }

  @Patch('read-all')
  markAllAsRead(
    @Query(new ZodValidationPipe(NotificationLogQueryFilterSchema))
    query: NotificationLogQueryFilter,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.notificationLogService.markAllAsRead(query, user);
  }
}
