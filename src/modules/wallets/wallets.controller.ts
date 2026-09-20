import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wallets')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'wallets', version: '1' })
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get my wallet' })
  getMyWallet(@CurrentUser('id') userId: string) { return this.walletsService.getWallet(userId); }

  @Get('my/transactions')
  @ApiOperation({ summary: 'Get my wallet transactions' })
  getTransactions(@CurrentUser('id') userId: string, @Query() dto: PaginationDto) {
    return this.walletsService.getTransactions(userId, dto);
  }

  @Post('my/topup')
  @ApiOperation({ summary: 'Top up wallet' })
  topUp(@CurrentUser('id') userId: string, @Body('amount') amount: number, @Body('reference') ref: string) {
    return this.walletsService.topUp(userId, amount, ref);
  }

  @Get('stats')
  @UseGuards(RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Wallet stats (Admin)' })
  getStats() { return this.walletsService.getStats(); }
}
