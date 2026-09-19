import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller({ path: 'audit', version: '1' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get() @ApiOperation({ summary: 'Get audit logs' })
  findAll(@Query() dto: any) { return this.auditService.findAll(dto); }

  @Get('stats') getStats() { return this.auditService.getStats(); }

  @Get('user/:userId')
  getUserActivity(@Param('userId') id: string, @Query() dto: PaginationDto) {
    return this.auditService.getUserActivity(id, dto);
  }
}
