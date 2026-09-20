import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Recommendations')
@Controller({ path: 'recommendations', version: '1' })
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('personalized')
  @ApiOperation({ summary: 'Personalized recommendations' })
  getPersonalized(@CurrentUser('id') userId: string, @Query('limit') limit: number) {
    return this.service.getPersonalized(userId, limit || 12);
  }

  @Public() @Get('similar/:productId')
  getSimilar(@Param('productId') id: string) { return this.service.getSimilar(id); }

  @Public() @Get('frequently-bought/:productId')
  getFrequentlyBought(@Param('productId') id: string) { return this.service.getFrequentlyBoughtTogether(id); }

  @Public() @Get('trending')
  getTrending(@Query('categoryId') catId?: string) { return this.service.getTrending(catId); }

  @Public() @Get('upsell/:productId')
  getUpsell(@Param('productId') id: string) { return this.service.getUpsell(id); }
}
