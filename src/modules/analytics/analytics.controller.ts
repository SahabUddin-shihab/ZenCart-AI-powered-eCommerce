import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Admin dashboard KPIs' })
  getDashboard() { return this.analyticsService.getAdminDashboard(); }

  @Get('revenue')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Revenue chart' })
  getRevenue(@Query('period') period: any) {
    return this.analyticsService.getRevenueChart(period || 'month');
  }

  @Get('users/growth')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'User growth chart' })
  getUserGrowth(@Query('days') days: number) {
    return this.analyticsService.getUserGrowthChart(days || 30);
  }

  @Get('categories/revenue')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Revenue by category' })
  getCategoryRevenue() { return this.analyticsService.getCategoryRevenue(); }

  @Get('funnel')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Conversion funnel' })
  getFunnel() { return this.analyticsService.getConversionFunnel(); }

  @Get('vendors/top')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Top vendors by revenue' })
  getTopVendors(@Query('limit') limit: number) {
    return this.analyticsService.getTopVendors(limit || 10);
  }

  @Get('cohort')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cohort analysis' })
  getCohort() { return this.analyticsService.getCohortAnalysis(); }

  @Public()
  @Post('event')
  @ApiOperation({ summary: 'Track analytics event (public)' })
  trackEvent(@Body() event: any) { return this.analyticsService.trackEvent(event); }
}
