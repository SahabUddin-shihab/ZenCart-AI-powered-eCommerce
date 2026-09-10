import { IsEmail, IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: '6-digit 2FA code', example: '123456' })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  twoFactorCode?: string;
}
