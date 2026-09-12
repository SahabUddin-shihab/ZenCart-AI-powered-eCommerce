import {
  IsString, IsOptional, IsNumber, Min, IsEnum, IsArray,
  IsBoolean, MaxLength, IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty() @IsString() @MaxLength(200) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ enum: ['SIMPLE','VARIABLE','BUNDLE','DIGITAL','SUBSCRIPTION','GIFT'] })
  @IsOptional() @IsEnum(['SIMPLE','VARIABLE','BUNDLE','DIGITAL','SUBSCRIPTION','GIFT'])
  type?: string;

  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) price: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() comparePrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() costPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() brandId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() skinTypes?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() concerns?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() tags?: string[];
  @ApiPropertyOptional() @IsOptional() dynamicAttributes?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() ingredients?: any[];
  @ApiPropertyOptional() @IsOptional() images?: any[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) stock?: number;
}
