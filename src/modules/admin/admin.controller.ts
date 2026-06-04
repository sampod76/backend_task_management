import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import { AuthPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLE } from '../user/user.types';
import { AdminService } from './admin.service';
import { CreateAdminDto, CreateAdminSchema } from './schemas/create.schema';
import { UpdateAdminDto, UpdateAdminSchema } from './schemas/update.schema';
import {
  AdminQueryFilterDto,
  AdminQueryFilterSchema,
} from './schemas/query-filter.schema';

@Controller('admins')
@Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(LoggingInterceptor)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreateAdminSchema)) dto: CreateAdminDto,
    @CurrentUser() user: AuthPayload,
  ) {
    void user;
    return this.adminService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(
    @Query(new ZodValidationPipe(AdminQueryFilterSchema))
    query: AdminQueryFilterDto,
    @CurrentUser() user: AuthPayload,
  ) {
    void user;
    return this.adminService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthPayload,
  ) {
    void user;
    return this.adminService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateAdminSchema)) dto: UpdateAdminDto,
    @CurrentUser() user: AuthPayload,
  ) {
    void user;
    return this.adminService.update(id, dto);
  }
}
