import { IsEmail, IsString, IsEnum, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsEnum(['ADMIN', 'MANAGER', 'USER'], { message: 'Invalid role assignment' })
  role: 'ADMIN' | 'MANAGER' | 'USER';
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}