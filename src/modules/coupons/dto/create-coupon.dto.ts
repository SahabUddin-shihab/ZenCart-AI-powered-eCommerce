import {
  IsString, IsEnum, IsOptional, IsNumber, Min, IsBoolean,
  IsDateString, IsArray, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCouponDto {
  @ApiProperty({ example: 'SAVE20' }) @IsString() @MaxLength(50) code: string;
  @ApiProperty({ example: 'Summer Sale 20% Off' }) @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiProperty({ enum: ['FIXED_DISCOUNT','PERCENTAGE_DISCOUNT','FREE_SHIPPING','BUY_X_GET_Y','FIRST_ORDER','REFERRAL','AI_PERSONALIZED'] })
  @IsEnum(['FIXED_DISCOUNT','PERCENTAGE_DISCOUNT','FREE_SHIPPING','BUY_X_GET_Y','FIRST_ORDER','REFERRAL','AI_PERSONALIZED'])
  type: string;

  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) discountValue: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() maxDiscountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() minOrderAmount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() usageLimit?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() usageLimitPerUser?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isStackable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAutoApply?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsArray() categoryIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() productIds?: string[];
  @ApiPropertyOptional() @IsOptional() conditions?: Record<string, any>;
}
