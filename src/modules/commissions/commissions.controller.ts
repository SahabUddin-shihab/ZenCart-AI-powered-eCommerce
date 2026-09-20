import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommissionsService } from './commissions.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Commissions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'commissions', version: '1' })
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get('my')
  @UseGuards(RolesGuard) @Roles('VENDOR')
  @ApiOperation({ summary: 'Get my commission history' })
  getMyCommissions(@CurrentUser() user: any, @Query() dto: any) {
    return this.commissionsService.getVendorCommissions(user.vendor.id, dto);
  }

  @Get('my/summary')
  @UseGuards(RolesGuard) @Roles('VENDOR')
  @ApiOperation({ summary: 'Get my commission summary' })
  getMySummary(@CurrentUser() user: any) {
    return this.commissionsService.getVendorSummary(user.vendor.id);
  }

  @Get('stats')
  @UseGuards(RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Global commission stats (Admin)' })
  getStats() { return this.commissionsService.getAllStats(); }

  @Get('vendor/:vendorId')
  @UseGuards(RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get vendor commissions (Admin)' })
  getVendorCommissions(@Param('vendorId') id: string, @Query() dto: PaginationDto) {
    return this.commissionsService.getVendorCommissions(id, dto);
  }

  @Get('calculate/:orderId')
  @UseGuards(RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Calculate commissions for order' })
  calculate(@Param('orderId') id: string) {
    return this.commissionsService.calculateForOrder(id);
  }

  @Post('settle/:vendorId')
  @UseGuards(RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Settle commissions for vendor' })
  settle(@Param('vendorId') vendorId: string, @Body('payoutId') payoutId: string) {
    return this.commissionsService.settleCommissions(vendorId, payoutId);
  }
}
