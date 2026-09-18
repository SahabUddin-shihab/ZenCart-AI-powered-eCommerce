import {
  Controller, Get, Post, Put, Body, Param, Query, Res, UseGuards, Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { SeoService } from './seo.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Seo')
@Controller({ path: 'seo', version: '1' })
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Public()
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  @ApiOperation({ summary: 'Generate XML sitemap' })
  async getSitemap(@Res() res: Response) {
    const xml = await this.seoService.generateSitemap();
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  }

  @Public()
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Get robots.txt' })
  async getRobots(@Res() res: Response) {
    const txt = await this.seoService.getRobotsTxt();
    res.set('Content-Type', 'text/plain');
    res.send(txt);
  }

  @Public()
  @Get('meta/:entityType/:entityId')
  @ApiOperation({ summary: 'Get SEO metadata for entity' })
  getMeta(@Param('entityType') type: string, @Param('entityId') id: string) {
    return this.seoService.getMetadata(type, id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VENDOR')
  @Put('meta/:entityType/:entityId')
  @ApiOperation({ summary: 'Upsert SEO metadata' })
  upsertMeta(@Param('entityType') type: string, @Param('entityId') id: string, @Body() data: any) {
    return this.seoService.upsertMetadata(type, id, data);
  }
}
