import { Injectable } from '@nestjs/common';
import { AppException } from 'src/common/errors';
import { UserService } from 'src/modules/user/user.service';
import { RegisterDto } from '../dto/registerUser.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from '../dto/login.dto';
import bcrypt from 'bcryptjs';
import { ROLE } from '../../user/user.types';
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private jwtService: JwtService,
  ) {}
  async registerUser(registerUserDto: RegisterDto) {
    const existingUser = await this.userService.findByEmail(
      registerUserDto.email,
    );
    if (existingUser) {
      throw AppException.conflict('User already exists');
    }
    const result = await this.userService.createUser({
      email: registerUserDto.email,
      username: registerUserDto.username,
      password: registerUserDto.password,
      role: registerUserDto.role ?? ROLE.USER,
      accountType: 'custom',
      status: 'active',
      isEmailVerified: false,
    });
    const payload = { userId: result.id, role: result.role };
    const token = await this.jwtService.signAsync(payload);
    return { access_token: token, role: result.role };
  }
  async login(loginDto: LoginDto) {
    const result = await this.userService.findByEmail(loginDto.email);
    if (!result) {
      throw AppException.notFound('User not found');
    }

    const isPasswordValid = await this.comparePassword(
      loginDto.password,
      result.password,
    );
    if (!isPasswordValid) {
      throw AppException.unauthorized('Invalid password');
    }
    // const tokenTest = this.config.get<string>('PROJECT_NAME');
    const payload = {
      userId: result.id,
      role: result.role,
    };
    const token = await this.generateJwtToken(payload);
    return {
      access_token: token,
      role: result.role,
      email: result.email,
      username: result.username,
    };
  }
  async profile(userId: string) {
    const result = await this.userService.user(userId);
    return result;
  }
  private async comparePassword(password: string, hashedPassword: string) {
    const isPasswordValid = await bcrypt.compare(password, hashedPassword);
    return isPasswordValid;
  }
  private async generateJwtToken({
    userId,
    role,
  }: {
    userId: string;
    role: string;
  }) {
    const payload = { userId, role };
    const token = await this.jwtService.signAsync(payload);
    return token;
  }
  users(): { message: string } {
    return {
      message: 'users',
    };
  }
}
