import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ErpService } from './erp.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Erp')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
@Controller({ path: 'erp', version: '1' })
export class ErpController {
  constructor(private readonly erpService: ErpService) {}

  @Get('dashboard') @ApiOperation({ summary: 'ERP dashboard overview' })
  getDashboard() { return this.erpService.getDashboard(); }

  @Get('health') @ApiOperation({ summary: 'System health check' })
  getHealth() { return this.erpService.getSystemHealth(); }
}
