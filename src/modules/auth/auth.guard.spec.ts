import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthGuard } from './auth.guard';
import { AppConfig } from '../../config/config.interface';

describe('AuthGuard', () => {
  it('should be defined', () => {
    const jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as JwtService;

    const configService = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService<AppConfig>;

    expect(new AuthGuard(jwtService, configService)).toBeDefined();
  });
});
