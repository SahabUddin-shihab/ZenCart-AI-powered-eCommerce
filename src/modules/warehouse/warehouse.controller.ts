import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Warehouse')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDOR', 'SUPER_ADMIN', 'ADMIN', 'MANAGER')
@Controller({ path: 'warehouses', version: '1' })
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get() findAll(@Query() dto: any, @CurrentUser() user: any) {
    const vendorId = user.role === 'VENDOR' ? user.vendor?.id : dto.vendorId;
    return this.warehouseService.findAll({ ...dto, vendorId });
  }
  @Get('stats') @Roles('SUPER_ADMIN', 'ADMIN') getStats() { return this.warehouseService.getStats(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.warehouseService.findById(id); }
  @Get(':id/value') getInventoryValue(@Param('id') id: string) { return this.warehouseService.getInventoryValue(id); }
  @Post() create(@Body() data: any, @CurrentUser() user: any) {
    const vendorId = user.role === 'VENDOR' ? user.vendor?.id : data.vendorId;
    return this.warehouseService.create({ ...data, vendorId });
  }
  @Put(':id') update(@Param('id') id: string, @Body() data: any) { return this.warehouseService.update(id, data); }
  @Delete(':id') @Roles('SUPER_ADMIN', 'ADMIN') delete(@Param('id') id: string) { return this.warehouseService.delete(id); }
}
