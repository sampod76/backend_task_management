import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { RegisterDto } from './dto/registerUser.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/currentUser.decorator';
import type { AuthPayload } from './auth.types';

@Controller('auth') // This decorator sets the route prefix for the controller. When applied, the prefix becomes ‘auth’ for all controller routes, while the global default prefix remains ‘api’
export class AuthController {
  /*  
 authService: AuthService;
  constructor(authService: AuthService) {
    this.authService = authService;
  } 
*/
  // shorthand
  constructor(private readonly authService: AuthService) {}
  @Post('signup') // /auth/signup
  signup(): string {
    return 'signup';
  }
  @Post('register') // /auth/register
  async register(@Body() registerUserDto: RegisterDto) {
    const result = await this.authService.registerUser(registerUserDto);
    return result;
  }
  @Post('login') // /auth/login
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return result;
  }
  @Get('users') // /auth/login
  users(): { message: string } {
    const result = this.authService.users();
    return result;
  }
  @Get('profile') // /auth/login
  @UseGuards(JwtAuthGuard)
  async profile(@CurrentUser() user: AuthPayload) {
    const result = await this.authService.profile(user.userId);
    return result;
  }
}
