import {
  Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiProductService } from './ai-product.service';
import { AiInsightsService } from './ai-insights.service';
import { AiChatService } from './ai-chat.service';
import { AiRecommendationsService } from './ai-recommendations.service';
import { AiContentService } from './ai-content.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('AI')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(
    private aiProduct: AiProductService,
    private aiInsights: AiInsightsService,
    private aiChat: AiChatService,
    private aiRecommend: AiRecommendationsService,
    private aiContent: AiContentService,
  ) {}

  // ── Product AI ───────────────────────────────────────────────────────────
  @Post('product/generate-description')
  @UseGuards(RolesGuard) @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'AI generate product description' })
  generateDescription(@Body() data: any) {
    return this.aiProduct.generateDescription(data);
  }

  @Post('product/generate-seo')
  @UseGuards(RolesGuard) @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'AI generate SEO metadata' })
  generateSeo(@Body() data: any) {
    return this.aiProduct.generateSeoMetadata(data);
  }

  @Post('product/:id/enhance')
  @UseGuards(RolesGuard) @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'AI enhance product (description + SEO + tags)' })
  enhanceProduct(@Param('id') id: string) {
    return this.aiProduct.enhanceProduct(id);
  }

  @Post('product/summarize-ingredients')
  @UseGuards(RolesGuard) @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'AI summarize product ingredients' })
  summarizeIngredients(@Body('ingredients') ingredients: string[]) {
    return this.aiProduct.summarizeIngredients(ingredients);
  }

  // ── Insights ─────────────────────────────────────────────────────────────
  @Get('insights')
  @UseGuards(RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get AI insights (Admin)' })
  getInsights(@Query('type') type?: string) {
    return this.aiInsights.getInsights({ type });
  }

  @Get('insights/vendor')
  @UseGuards(RolesGuard) @Roles('VENDOR')
  @ApiOperation({ summary: 'Get vendor AI insights' })
  getVendorInsights(@CurrentUser() user: any) {
    return this.aiInsights.getInsights({ vendorId: user.vendor?.id });
  }

  @Post('insights/discount-analysis')
  @UseGuards(RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VENDOR')
  @ApiOperation({ summary: 'AI discount effectiveness analysis' })
  analyzeDiscount(@Body('couponCode') code: string) {
    return this.aiInsights.analyzeDiscountEffectiveness(code);
  }

  // ── Chat ─────────────────────────────────────────────────────────────────
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI shopping assistant chat' })
  chat(
    @CurrentUser('id') userId: string,
    @Body('sessionId') sessionId: string,
    @Body('message') message: string,
  ) {
    return this.aiChat.chat(userId, sessionId, message);
  }

  @Post('chat/beauty-recommendation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get personalized beauty advice' })
  beautyAdvice(@CurrentUser('id') userId: string, @Body('query') query: string) {
    return this.aiChat.getBeautyRecommendation(userId, query);
  }

  @Post('chat/shade-match')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI shade matching' })
  shadeMatch(@Body('skinTone') skinTone: string, @Body('productType') productType: string) {
    return this.aiChat.matchShade(skinTone, productType);
  }

  @Post('chat/skincare-routine')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate skincare routine' })
  skincareRoutine(@Body() profile: any) {
    return this.aiChat.generateSkinRoutine(profile);
  }

  // ── Recommendations ──────────────────────────────────────────────────────
  @Get('recommendations/personalized')
  @ApiOperation({ summary: 'Personalized product recommendations' })
  getPersonalized(@CurrentUser('id') userId: string, @Query('limit') limit: number) {
    return this.aiRecommend.getPersonalized(userId, limit || 12);
  }

  @Public()
  @Get('recommendations/similar/:productId')
  @ApiOperation({ summary: 'Similar products' })
  getSimilar(@Param('productId') id: string) {
    return this.aiRecommend.getSimilar(id);
  }

  @Public()
  @Get('recommendations/frequently-bought/:productId')
  @ApiOperation({ summary: 'Frequently bought together' })
  getFrequentlyBought(@Param('productId') id: string) {
    return this.aiRecommend.getFrequentlyBoughtTogether(id);
  }

  @Public()
  @Get('recommendations/trending')
  @ApiOperation({ summary: 'Trending products' })
  getTrending(@Query('categoryId') categoryId?: string) {
    return this.aiRecommend.getTrending(categoryId);
  }

  // ── Content ──────────────────────────────────────────────────────────────
  @Post('content/blog')
  @UseGuards(RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VENDOR')
  @ApiOperation({ summary: 'AI generate blog post' })
  generateBlog(@Body() data: any) {
    return this.aiContent.generateBlogPost(data.topic, data.keywords, data.length);
  }

  @Post('content/email-campaign')
  @UseGuards(RolesGuard) @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'AI generate email campaign' })
  generateEmail(@Body() data: any) {
    return this.aiContent.generateEmailCampaign(data);
  }
}
