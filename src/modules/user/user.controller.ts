import {
  Body,
  Controller,
  Delete,
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
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLE } from './user.types';
import { UserService } from './user.service';
import { CreateUserDto, CreateUserSchema } from './schemas/create.schema';
import { UpdateUserDto, UpdateUserSchema } from './schemas/update.schema';
import {
  UserQueryFilterDto,
  UserQueryFilterSchema,
} from './schemas/query-filter.schema';

@Controller('users')
@Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(LoggingInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUserDto,
    @CurrentUser() user: AuthPayload,
  ) {
    void user;
    return this.userService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(
    @Query(new ZodValidationPipe(UserQueryFilterSchema))
    query: UserQueryFilterDto,
    @CurrentUser() user: AuthPayload,
  ) {
    void user;
    return this.userService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthPayload,
  ) {
    void user;
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserDto,
    @CurrentUser() user: AuthPayload,
  ) {
    void user;
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthPayload,
  ) {
    void user;
    return this.userService.remove(id);
  }
}
