import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FraudDetectionService } from './fraud-detection.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('FraudDetection')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller({ path: 'fraud-detection', version: '1' })
export class FraudDetectionController {
  constructor(private readonly service: FraudDetectionService) {}

  @Get('alerts')
  @ApiOperation({ summary: 'Get fraud alerts' })
  getAlerts(@Query() dto: PaginationDto) { return this.service.getAlerts(dto); }

  @Get('stats')
  @ApiOperation({ summary: 'Fraud detection stats' })
  getStats() { return this.service.getStats(); }

  @Post('score')
  @ApiOperation({ summary: 'Score an order for fraud' })
  scoreOrder(@Body() data: any) {
    return this.service.scoreOrder(data.orderId, data.userId, data.ipAddress, data.userAgent);
  }
}
