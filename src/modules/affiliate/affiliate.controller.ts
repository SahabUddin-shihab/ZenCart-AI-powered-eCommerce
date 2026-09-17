import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AffiliateService } from './affiliate.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Affiliate')
@Controller({ path: 'affiliate', version: '1' })
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Public()
  @Get('leaderboard')
  getLeaderboard() { return this.affiliateService.getLeaderboard(); }

  @Public()
  @Get('track/:code')
  @ApiOperation({ summary: 'Track affiliate link click' })
  trackClick(@Param('code') code: string) { return this.affiliateService.trackClick(code); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('join')
  @ApiOperation({ summary: 'Join affiliate program' })
  join(@CurrentUser('id') userId: string) { return this.affiliateService.createProfile(userId); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AFFILIATE')
  @Get('my')
  @ApiOperation({ summary: 'Get my affiliate profile' })
  getMyProfile(@CurrentUser('id') userId: string) { return this.affiliateService.getProfile(userId); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AFFILIATE')
  @Post('my/links')
  @ApiOperation({ summary: 'Create affiliate link' })
  createLink(@CurrentUser() user: any, @Body('productId') productId?: string) {
    return this.affiliateService.createLink(user.affiliateProfile?.id, productId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Get()
  @ApiOperation({ summary: 'List all affiliates (Admin)' })
  findAll(@Query() dto: PaginationDto) { return this.affiliateService.findAll(dto); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('stats')
  getStats() { return this.affiliateService.getStats(); }
}
