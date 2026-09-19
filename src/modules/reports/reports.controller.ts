import {
  Controller, Get, Query, Res, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VENDOR')
  @ApiOperation({ summary: 'Sales report' })
  getSales(
    @Query('startDate') start: string,
    @Query('endDate') end: string,
    @CurrentUser() user: any,
  ) {
    const vendorId = user.role === 'VENDOR' ? user.vendor?.id : undefined;
    return this.reportsService.getSalesReport(
      new Date(start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      new Date(end || new Date().toISOString()),
      vendorId,
    );
  }

  @Get('inventory')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VENDOR')
  @ApiOperation({ summary: 'Inventory report' })
  getInventory(@CurrentUser() user: any) {
    return this.reportsService.getInventoryReport(user.role === 'VENDOR' ? user.vendor?.id : undefined);
  }

  @Get('customers')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Customer report' })
  getCustomers() { return this.reportsService.getCustomerReport(); }

  @Get('vendors')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Vendor report' })
  getVendors() { return this.reportsService.getVendorReport(); }

  @Get('products')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VENDOR')
  @ApiOperation({ summary: 'Product report' })
  getProducts(@CurrentUser() user: any) {
    return this.reportsService.getProductReport(user.role === 'VENDOR' ? user.vendor?.id : undefined);
  }

  @Get('export/sales')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Export sales CSV' })
  async exportSales(
    @Query('startDate') start: string,
    @Query('endDate') end: string,
    @Res() res: Response,
  ) {
    const csv = await this.reportsService.exportSalesCsv(
      new Date(start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      new Date(end || new Date().toISOString()),
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sales-report-${Date.now()}.csv"`);
    res.send(csv);
  }
}
