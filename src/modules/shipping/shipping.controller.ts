import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Shipping')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'shipping', version: '1' })
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Public()
  @Get('rates')
  @ApiOperation({ summary: 'Get shipping rates' })
  getRates(
    @Query('fromCity') from: string,
    @Query('toCity') to: string,
    @Query('weight') weight: number,
  ) { return this.shippingService.getRates(from, to, weight || 0.5); }

  @Post('create/:orderId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VENDOR')
  @ApiOperation({ summary: 'Create shipment for order' })
  createShipment(
    @Param('orderId') orderId: string,
    @Body('courier') courier: string,
    @Body('toAddress') toAddress: any,
  ) { return this.shippingService.createShipment(orderId, courier, toAddress); }

  @Get('track/:trackingNumber')
  @ApiOperation({ summary: 'Track shipment' })
  track(@Param('trackingNumber') tracking: string, @Query('courier') courier: string) {
    return this.shippingService.trackShipment(tracking, courier);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get shipments for order' })
  getByOrder(@Param('orderId') orderId: string) {
    return this.shippingService.getOrderShipments(orderId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update shipment status (Admin)' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.shippingService.updateShipmentStatus(id, status);
  }
}
