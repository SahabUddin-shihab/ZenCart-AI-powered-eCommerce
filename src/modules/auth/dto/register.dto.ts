import {
  IsEmail, IsString, MinLength, MaxLength, IsOptional,
  IsPhoneNumber, IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(50)
  lastName: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ['CUSTOMER', 'VENDOR', 'AFFILIATE'] })
  @IsOptional()
  @IsEnum(['CUSTOMER', 'VENDOR', 'AFFILIATE'])
  role?: 'CUSTOMER' | 'VENDOR' | 'AFFILIATE';
}
