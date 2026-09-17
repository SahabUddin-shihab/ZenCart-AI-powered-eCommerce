import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BlogsService } from './blogs.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Blogs')
@Controller({ path: 'blogs', version: '1' })
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Public() @Get() findAll(@Query() dto: any) { return this.blogsService.findAll(dto); }
  @Public() @Get(':slug') findOne(@Param('slug') slug: string) { return this.blogsService.findBySlug(slug); }
  @Public() @Get(':slug/related') getRelated(@Param('slug') slug: string) { return this.blogsService.getRelated(slug); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VENDOR')
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.blogsService.create(userId, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Put(':id') update(@Param('id') id: string, @Body() dto: any) { return this.blogsService.update(id, dto); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Patch(':id/publish') publish(@Param('id') id: string) { return this.blogsService.publish(id); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id') delete(@Param('id') id: string) { return this.blogsService.delete(id); }
}
