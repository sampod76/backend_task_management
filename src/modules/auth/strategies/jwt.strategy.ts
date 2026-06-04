import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../user/user.service';
import { AppConfig } from '../../../config/app.config';
import { AuthPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly UserService: UserService,
  ) {
    const envApp = configService.getOrThrow('app', { infer: true });
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envApp.jwt.access_secret,
    });
  }
  async validate(payload: AuthPayload) {
    try {
      const user = await this.UserService.user(payload.userId);
      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }
      return {
        userId: user.id,
        role: user.role,
      };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
