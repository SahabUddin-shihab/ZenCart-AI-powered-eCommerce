import {
  Controller, Get, Post, Put, Patch, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { VendorAnalyticsService } from './vendor-analytics.service';
import { VendorOnboardingService } from './vendor-onboarding.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Vendors')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'vendors', version: '1' })
export class VendorsController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly analyticsService: VendorAnalyticsService,
    private readonly onboardingService: VendorOnboardingService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create vendor profile' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateVendorDto) {
    return this.vendorsService.create(userId, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List all vendors (Admin)' })
  findAll(@Query() dto: PaginationDto) {
    return this.vendorsService.findAll(dto);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get vendor subscription plans' })
  getPlans() {
    return this.vendorsService.getPlans();
  }

  @Get('store/:slug')
  @ApiOperation({ summary: 'Get vendor by store slug (public)' })
  findBySlug(@Param('slug') slug: string) {
    return this.vendorsService.findBySlug(slug);
  }

  @Get('my/profile')
  @UseGuards(RolesGuard)
  @Roles('VENDOR')
  @ApiOperation({ summary: 'Get my vendor profile' })
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.vendorsService.getVendorByUserId(userId);
  }

  @Get('my/dashboard')
  @UseGuards(RolesGuard)
  @Roles('VENDOR')
  @ApiOperation({ summary: 'Vendor dashboard stats' })
  async getDashboard(@CurrentUser() user: any) {
    const vendor = await this.vendorsService.getVendorByUserId(user.id);
    return this.analyticsService.getDashboardStats(vendor.id);
  }

  @Get('my/analytics/sales')
  @UseGuards(RolesGuard)
  @Roles('VENDOR')
  @ApiOperation({ summary: 'Vendor sales chart' })
  async getSalesChart(@CurrentUser() user: any, @Query('period') period: any) {
    const vendor = await this.vendorsService.getVendorByUserId(user.id);
    return this.analyticsService.getSalesChart(vendor.id, period);
  }

  @Get('my/analytics/top-products')
  @UseGuards(RolesGuard)
  @Roles('VENDOR')
  @ApiOperation({ summary: 'Vendor top products' })
  async getTopProducts(@CurrentUser() user: any) {
    const vendor = await this.vendorsService.getVendorByUserId(user.id);
    return this.analyticsService.getTopProducts(vendor.id);
  }

  @Get('my/onboarding')
  @UseGuards(RolesGuard)
  @Roles('VENDOR')
  @ApiOperation({ summary: 'Vendor onboarding checklist' })
  async getOnboarding(@CurrentUser() user: any) {
    const vendor = await this.vendorsService.getVendorByUserId(user.id);
    return this.onboardingService.getOnboardingStatus(vendor.id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get vendor by ID (Admin)' })
  findOne(@Param('id') id: string) {
    return this.vendorsService.findById(id);
  }

  @Put('my/profile')
  @UseGuards(RolesGuard)
  @Roles('VENDOR')
  @ApiOperation({ summary: 'Update vendor profile' })
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateVendorDto) {
    const vendor = await this.vendorsService.getVendorByUserId(user.id);
    return this.vendorsService.update(vendor.id, dto);
  }

  @Post('my/logo')
  @UseGuards(RolesGuard)
  @Roles('VENDOR')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async uploadLogo(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    const vendor = await this.vendorsService.getVendorByUserId(user.id);
    return this.vendorsService.uploadLogo(vendor.id, file.buffer);
  }

  @Post('my/banner')
  @UseGuards(RolesGuard)
  @Roles('VENDOR')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async uploadBanner(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    const vendor = await this.vendorsService.getVendorByUserId(user.id);
    return this.vendorsService.uploadBanner(vendor.id, file.buffer);
  }

  @Post('my/kyc')
  @UseGuards(RolesGuard)
  @Roles('VENDOR')
  async submitKyc(@CurrentUser() user: any, @Body() documents: any) {
    const vendor = await this.vendorsService.getVendorByUserId(user.id);
    return this.vendorsService.submitKyc(vendor.id, documents);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Approve vendor' })
  approve(@Param('id') id: string) {
    return this.vendorsService.approve(id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Reject vendor' })
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.vendorsService.reject(id, reason);
  }

  @Patch(':id/suspend')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Suspend vendor' })
  suspend(@Param('id') id: string) {
    return this.vendorsService.suspend(id);
  }
}
