import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorDto {
  @ApiProperty({ example: 'Glow Beauty Store' })
  @IsString() @MaxLength(100)
  storeName: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(1000)
  storeDescription?: string;
}
