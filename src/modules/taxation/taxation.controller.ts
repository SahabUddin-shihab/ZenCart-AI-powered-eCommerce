import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TaxationService } from './taxation.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Taxation')
@Controller({ path: 'taxation', version: '1' })
export class TaxationController {
  constructor(private readonly taxationService: TaxationService) {}

  @Public() @Get('rules') getRules(@Query('country') country?: string) { return this.taxationService.getRules(country); }
  @Public() @Get('calculate') calculate(@Query('amount') amount: number, @Query('country') country: string, @Query('category') cat?: string) {
    return this.taxationService.calculateTax(amount, country || 'BD', cat);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('rules') createRule(@Body() data: any) { return this.taxationService.createRule(data); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Put('rules/:id') updateRule(@Param('id') id: string, @Body() data: any) { return this.taxationService.updateRule(id, data); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete('rules/:id') deleteRule(@Param('id') id: string) { return this.taxationService.deleteRule(id); }
}
