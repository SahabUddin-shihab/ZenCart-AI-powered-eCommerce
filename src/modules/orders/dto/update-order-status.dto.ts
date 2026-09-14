import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ['CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','ON_HOLD'] })
  @IsEnum(['CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','ON_HOLD','REFUNDED'])
  status: string;

  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
