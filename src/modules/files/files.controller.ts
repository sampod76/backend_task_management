import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { FileQueryDto } from './dto/file-query.dto';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { AuthPayload } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLE } from '../user/user.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  @Roles(ROLE.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(LoggingInterceptor)
  @HttpCode(HttpStatus.CREATED)
  createUploadUrl(
    @Body() dto: CreateUploadUrlDto,
    @CurrentUser() user: AuthPayload,
  ) {
    const userId = user.userId;
    return this.filesService.createUploadUrl(dto, userId);
  }

  @Post('confirm-upload')
  @Roles(ROLE.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(LoggingInterceptor)
  @HttpCode(HttpStatus.CREATED)
  confirmUpload(
    @Body() dto: ConfirmUploadDto,
    @CurrentUser() user: AuthPayload,
  ) {
    const userId = user.userId;
    return this.filesService.confirmUpload(dto, userId);
  }

  @Get('private/:fileKey')
  @Roles(ROLE.ADMIN, ROLE.USER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getPrivateFileUrl(@Param('fileKey') fileKey: string) {
    return this.filesService.getPrivateFileUrl(fileKey);
  }

  @Get()
  @Roles(ROLE.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  listFiles(@Query() query: FileQueryDto) {
    return this.filesService.listFiles(query);
  }

  @Delete(':id')
  @Roles(ROLE.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFile(@Param('id') id: string) {
    return this.filesService.deleteFile(id);
  }
}
