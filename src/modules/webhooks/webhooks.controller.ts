import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Webhooks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller({ path: 'webhooks', version: '1' })
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get() findAll(@Query() dto: PaginationDto) { return this.webhooksService.findAll(dto); }
  @Get('stats') getStats() { return this.webhooksService.getStats(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.webhooksService.findById(id); }
  @Get(':id/deliveries') getDeliveries(@Param('id') id: string, @Query() dto: PaginationDto) {
    return this.webhooksService.getDeliveries(id, dto);
  }
  @Post() create(@Body() data: any) { return this.webhooksService.create(data); }
  @Post(':id/test') test(@Param('id') id: string) { return this.webhooksService.testWebhook(id); }
  @Put(':id') update(@Param('id') id: string, @Body() data: any) { return this.webhooksService.update(id, data); }
  @Delete(':id') delete(@Param('id') id: string) { return this.webhooksService.delete(id); }
}
