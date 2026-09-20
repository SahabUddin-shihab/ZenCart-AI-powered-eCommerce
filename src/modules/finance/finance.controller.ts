import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Finance')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller({ path: 'finance', version: '1' })
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('profit-loss')
  @ApiOperation({ summary: 'Profit & loss report' })
  getPL(@Query('startDate') start: string, @Query('endDate') end: string) {
    return this.financeService.getProfitLoss(new Date(start), new Date(end));
  }

  @Get('payouts')
  @ApiOperation({ summary: 'Get vendor payouts' })
  getPayouts(@Query() dto: any) { return this.financeService.getVendorPayouts(dto); }

  @Post('payouts/:vendorId')
  @ApiOperation({ summary: 'Create vendor payout' })
  createPayout(@Param('vendorId') id: string, @Body('method') method: string, @Body('bankDetails') bank: any) {
    return this.financeService.createPayout(id, method, bank);
  }

  @Post('payouts/:payoutId/process')
  @ApiOperation({ summary: 'Process payout' })
  processPayout(@Param('payoutId') id: string, @Body('reference') ref: string) {
    return this.financeService.processPayout(id, ref);
  }

  @Get('revenue-by-vendor')
  getRevenueByVendor(@Query('limit') limit: number) { return this.financeService.getRevenueByVendor(limit); }

  @Get('tax-report')
  getTaxReport(@Query('startDate') start: string, @Query('endDate') end: string) {
    return this.financeService.getTaxReport(new Date(start), new Date(end));
  }
}
