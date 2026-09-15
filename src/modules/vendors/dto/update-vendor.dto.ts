import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVendorDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) storeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storeDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customDomain?: string;
}
