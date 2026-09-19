import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Permissions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller({ path: 'permissions', version: '1' })
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get() findAll(@Query() dto: PaginationDto) { return this.permissionsService.findAll(dto); }
  @Get('matrix') getMatrix() { return this.permissionsService.getMatrix(); }
  @Get('role/:role') getByRole(@Param('role') role: string) { return this.permissionsService.getByRole(role); }
  @Post() create(@Body() data: any) { return this.permissionsService.create(data); }
  @Post('bulk') bulkUpsert(@Body() data: any[]) { return this.permissionsService.bulkUpsert(data); }
  @Get('check') check(@Query('role') r: string, @Query('module') m: string, @Query('action') a: string) {
    return this.permissionsService.check(r, m, a);
  }
  @Delete(':id') delete(@Param('id') id: string) { return this.permissionsService.delete(id); }
}
