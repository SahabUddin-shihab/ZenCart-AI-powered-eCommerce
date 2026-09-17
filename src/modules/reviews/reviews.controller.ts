import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reviews')
@Controller({ path: 'reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'Get reviews for a product' })
  findByProduct(@Param('productId') id: string, @Query() dto: any) {
    return this.reviewsService.findByProduct(id, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create review' })
  create(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.reviewsService.create(userId, dto);
  }

  @Public()
  @Patch(':id/helpful')
  @ApiOperation({ summary: 'Mark review as helpful' })
  markHelpful(@Param('id') id: string) {
    return this.reviewsService.markHelpful(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR')
  @Post(':id/reply')
  @ApiOperation({ summary: 'Vendor reply to review' })
  reply(@Param('id') id: string, @CurrentUser() user: any, @Body('reply') reply: string) {
    return this.reviewsService.reply(id, user.vendor.id, reply);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Get()
  @ApiOperation({ summary: 'List all reviews (Admin)' })
  findAll(@Query() dto: PaginationDto) {
    return this.reviewsService.findAll(dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.reviewsService.approve(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.reviewsService.reject(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.reviewsService.delete(id, userId);
  }
}
