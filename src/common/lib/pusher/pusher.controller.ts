import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PusherService } from './pusher.service';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../modules/auth/guards/roles.guard';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { Roles } from '../../../modules/auth/decorators/roles.decorator';
import { AuthPayload } from '../../../modules/auth/auth.types';
import { ROLE } from '../../../modules/user/user.types';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import {
  PusherChannelAuthDto,
  PusherChannelAuthSchema,
  PusherUserAuthDto,
  PusherUserAuthSchema,
  SendChannelNotificationDto,
  SendChannelNotificationSchema,
  SendUserNotificationDto,
  SendUserNotificationSchema,
} from './schemas/pusher.schema';
import { PusherUserInfo } from './pusher.types';

@Controller('pusher')
export class PusherController {
  constructor(private readonly pusherService: PusherService) {}

  @Post('auth/channel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  authorizeChannel(
    @Body(new ZodValidationPipe(PusherChannelAuthSchema))
    body: PusherChannelAuthDto,
    @CurrentUser() user: AuthPayload,
  ) {
    const pusherUser: PusherUserInfo = {
      userId: user.userId,
      role: user.role,
    };

    return this.pusherService.authorizeChannel(
      {
        socket_id: body.socket_id,
        channel_name: body.channel_name,
        service_name: body.service_name,
      },
      pusherUser,
    );
  }

  @Post('auth/user')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  authorizeUser(
    @Body(new ZodValidationPipe(PusherUserAuthSchema)) body: PusherUserAuthDto,
    @CurrentUser() user: AuthPayload,
  ) {
    const pusherUser: PusherUserInfo = {
      userId: user.userId,
      role: user.role,
    };

    return this.pusherService.authorizeUser(body.socket_id, pusherUser);
  }

  @Post('send/users')
  @HttpCode(HttpStatus.OK)
  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async sendToUsers(
    @Body(new ZodValidationPipe(SendUserNotificationSchema))
    body: SendUserNotificationDto,
  ): Promise<any> {
    return this.pusherService.sendToUsers(body);
  }

  @Post('send/channels')
  @HttpCode(HttpStatus.OK)
  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async triggerChannels(
    @Body(new ZodValidationPipe(SendChannelNotificationSchema))
    body: SendChannelNotificationDto,
  ): Promise<any> {
    return this.pusherService.triggerChannels(body);
  }
}
