import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InfluencerService } from './influencer.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Influencer')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'influencer', version: '1' })
export class InfluencerController {
  constructor(private readonly service: InfluencerService) {}

  @Post('join') join(@CurrentUser('id') userId: string, @Body() data: any) { return this.service.createProfile(userId, data); }
  @Get('my') getMyProfile(@CurrentUser('id') userId: string) { return this.service.getProfile(userId); }

  @UseGuards(RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Get() findAll(@Query() dto: PaginationDto) { return this.service.findAll(dto); }
  @UseGuards(RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('stats') getStats() { return this.service.getStats(); }
}
