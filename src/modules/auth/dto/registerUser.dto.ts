import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ROLE, Role } from '../../user/user.types';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  @IsIn([ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN])
  role?: Role;
}
