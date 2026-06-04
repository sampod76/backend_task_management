import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLE } from '../user/user.types';
import {
  AuditLogQueryFilter,
  AuditLogQueryFilterSchema,
} from './schema/audit-log.filter.schema';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { AuthPayload } from '../auth/auth.types';
import { ServiceName } from '../../common/constants/automation';

@Controller('audit-log')
@Roles(ROLE.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(AuditLogQueryFilterSchema))
    query: AuditLogQueryFilter,
    @CurrentUser() user: AuthPayload,
  ) {
    const result = await this.auditLogService.findAll(query, user);

    return result;
  }

  @Get(':id/:serviceName')
  findOne(
    @Param('id') id: string,
    @Param('serviceName') serviceName: ServiceName,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.auditLogService.findOne(id, serviceName, user);
  }
  findByID(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    // return this.auditLogService.findOne(id, user);
  }
}
