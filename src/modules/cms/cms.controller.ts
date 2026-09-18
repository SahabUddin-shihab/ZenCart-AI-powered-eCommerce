import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('CMS')
@Controller({ path: 'cms', version: '1' })
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Public()
  @Get('homepage')
  @ApiOperation({ summary: 'Get full homepage layout' })
  getHomePage() { return this.cmsService.getHomePage(); }

  @Public()
  @Get('pages/:slug')
  @ApiOperation({ summary: 'Get page by slug' })
  getPage(@Param('slug') slug: string) { return this.cmsService.getPage(slug); }

  @Public()
  @Get('blocks/:identifier')
  @ApiOperation({ summary: 'Get CMS block by identifier' })
  getBlock(@Param('identifier') id: string) { return this.cmsService.getBlock(id); }

  @Public()
  @Get('blocks/type/:type')
  @ApiOperation({ summary: 'Get CMS blocks by type' })
  getBlocksByType(@Param('type') type: string) { return this.cmsService.getBlocksByType(type); }

  @Public()
  @Get('menus/:location')
  @ApiOperation({ summary: 'Get menu by location' })
  getMenu(@Param('location') location: string) { return this.cmsService.getMenu(location); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Get('pages')
  @ApiOperation({ summary: 'List all pages (Admin)' })
  getPages(@Query('all') all: boolean) { return this.cmsService.getPages(all); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Post('pages')
  @ApiOperation({ summary: 'Create page (Admin)' })
  createPage(@Body() data: any) { return this.cmsService.createPage(data); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Put('pages/:id')
  @ApiOperation({ summary: 'Update page (Admin)' })
  updatePage(@Param('id') id: string, @Body() data: any) { return this.cmsService.updatePage(id, data); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Patch('pages/:id/publish')
  @ApiOperation({ summary: 'Publish page (Admin)' })
  publishPage(@Param('id') id: string) { return this.cmsService.publishPage(id); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Post('blocks')
  @ApiOperation({ summary: 'Create CMS block (Admin)' })
  createBlock(@Body() data: any) { return this.cmsService.createBlock(data); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Put('blocks/:id')
  @ApiOperation({ summary: 'Update CMS block (Admin)' })
  updateBlock(@Param('id') id: string, @Body() data: any) { return this.cmsService.updateBlock(id, data); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Delete('blocks/:id')
  @ApiOperation({ summary: 'Delete CMS block (Admin)' })
  deleteBlock(@Param('id') id: string) { return this.cmsService.deleteBlock(id); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Post('menus/:location')
  @ApiOperation({ summary: 'Upsert menu (Admin)' })
  upsertMenu(
    @Param('location') location: string,
    @Body('name') name: string,
    @Body('items') items: any[],
  ) { return this.cmsService.upsertMenu(location, name, items); }
}
