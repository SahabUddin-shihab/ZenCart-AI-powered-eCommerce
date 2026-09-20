import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('FeatureFlags')
@Controller({ path: 'feature-flags', version: '1' })
export class FeatureFlagsController {
  constructor(private readonly service: FeatureFlagsService) {}

  @Public() @Get('public') getPublic() { return this.service.getPublic(); }
  @Public() @Get('check/:key') check(@Param('key') key: string, @Query('userId') userId?: string) {
    return this.service.check(key, userId);
  }

  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN')
  @Get() findAll(@Query() dto: PaginationDto) { return this.service.findAll(dto); }

  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN')
  @Post() create(@Body() data: any) { return this.service.create(data); }

  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':key/toggle') toggle(@Param('key') key: string) { return this.service.toggle(key); }

  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN')
  @Put(':id') update(@Param('id') id: string, @Body() data: any) { return this.service.update(id, data); }

  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id') delete(@Param('id') id: string) { return this.service.delete(id); }
}
