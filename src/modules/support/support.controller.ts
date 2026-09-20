import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Support')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'support', version: '1' })
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Create support ticket' })
  create(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.supportService.createTicket(userId, dto);
  }

  @Get('tickets/my')
  @ApiOperation({ summary: 'My support tickets' })
  getMyTickets(@CurrentUser('id') userId: string, @Query() dto: PaginationDto) {
    return this.supportService.findByUser(userId, dto);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  findOne(@Param('id') id: string) { return this.supportService.findById(id); }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add message to ticket' })
  addMessage(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() body: any) {
    return this.supportService.addMessage(id, userId, body.message, false, body.attachments);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF')
  @Get('tickets')
  @ApiOperation({ summary: 'List all tickets (Staff)' })
  findAll(@Query() dto: any) { return this.supportService.findAll(dto); }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF')
  @Post('tickets/:id/reply')
  @ApiOperation({ summary: 'Staff reply to ticket' })
  reply(@Param('id') id: string, @CurrentUser('id') userId: string, @Body('message') message: string) {
    return this.supportService.addMessage(id, userId, message, true);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF')
  @Patch('tickets/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.supportService.updateStatus(id, status);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Get('stats')
  getStats() { return this.supportService.getStats(); }
}
