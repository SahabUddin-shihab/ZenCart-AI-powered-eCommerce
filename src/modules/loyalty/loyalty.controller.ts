import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Loyalty')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'loyalty', version: '1' })
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get my loyalty points balance' })
  getBalance(@CurrentUser('id') userId: string) { return this.loyaltyService.getBalance(userId); }

  @Get('history')
  @ApiOperation({ summary: 'Get points history' })
  getHistory(@CurrentUser('id') userId: string, @Query() dto: PaginationDto) {
    return this.loyaltyService.getHistory(userId, dto);
  }

  @Get('tier')
  @ApiOperation({ summary: 'Get my loyalty tier' })
  getTier(@CurrentUser('id') userId: string) { return this.loyaltyService.getUserTier(userId); }

  @Get('tiers')
  @ApiOperation({ summary: 'Get all loyalty tiers' })
  getTiers() { return this.loyaltyService.getTiers(); }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem loyalty points' })
  redeem(@CurrentUser('id') userId: string, @Body('points') points: number) {
    return this.loyaltyService.redeem(userId, points);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Top loyalty points earners' })
  getLeaderboard() { return this.loyaltyService.getLeaderboard(); }
}
