import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Coupons')
@Controller({ path: 'coupons', version: '1' })
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Get public coupon offers' })
  getPublic() { return this.couponsService.getPublicCoupons(); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('validate')
  @ApiOperation({ summary: 'Validate coupon code' })
  validate(
    @CurrentUser('id') userId: string,
    @Body('code') code: string,
    @Body('cartTotal') cartTotal: number,
  ) { return this.couponsService.validate(code, userId, cartTotal); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Post()
  @ApiOperation({ summary: 'Create coupon (Admin)' })
  create(@Body() dto: CreateCouponDto) { return this.couponsService.create(dto); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Get()
  @ApiOperation({ summary: 'List coupons (Admin)' })
  findAll(@Query() dto: PaginationDto) { return this.couponsService.findAll(dto); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Get('stats')
  getStats() { return this.couponsService.getStats(); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Get(':id')
  findOne(@Param('id') id: string) { return this.couponsService.findById(id); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) { return this.couponsService.update(id, data); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) { return this.couponsService.deactivate(id); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  delete(@Param('id') id: string) { return this.couponsService.delete(id); }
}
