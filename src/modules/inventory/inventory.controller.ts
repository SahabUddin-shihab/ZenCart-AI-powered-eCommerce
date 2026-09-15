import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDOR', 'SUPER_ADMIN', 'ADMIN', 'MANAGER')
@Controller({ path: 'inventory', version: '1' })
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get inventory for a product' })
  getByProduct(@Param('productId') id: string) { return this.inventoryService.getByProduct(id); }

  @Patch(':id/adjust')
  @ApiOperation({ summary: 'Adjust stock quantity' })
  adjust(@Param('id') id: string, @Body('quantity') qty: number, @Body('reason') reason: string) {
    return this.inventoryService.adjustStock(id, qty, reason);
  }

  @Post('bulk-update')
  @ApiOperation({ summary: 'Bulk update stock quantities' })
  bulkUpdate(@Body() updates: any[]) { return this.inventoryService.bulkUpdate(updates); }

  @Get('alerts/low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  getLowStock(@CurrentUser() user: any) {
    return this.inventoryService.getLowStockAlerts(user.role === 'VENDOR' ? user.vendor?.id : undefined);
  }

  @Get('alerts/expiring')
  @ApiOperation({ summary: 'Get expiring items' })
  getExpiring(@Query('days') days: number) { return this.inventoryService.getExpiringSoon(days || 30); }

  @Post('transfer')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  transfer(@Body() data: any) {
    return this.inventoryService.transferStock(data.fromWarehouseId, data.toWarehouseId, data.productId, data.quantity);
  }
}
