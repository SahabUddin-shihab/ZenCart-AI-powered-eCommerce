import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() shippingAddressId?: string;
  @ApiPropertyOptional({ enum: ['STRIPE','SSLCOMMERZ','BKASH','NAGAD','WALLET','COD'] })
  @IsOptional() @IsEnum(['STRIPE','SSLCOMMERZ','BKASH','NAGAD','WALLET','COD'])
  paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string;
}
