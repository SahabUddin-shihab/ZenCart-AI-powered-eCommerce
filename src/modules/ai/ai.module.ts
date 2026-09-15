import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiProductService } from './ai-product.service';
import { AiInsightsService } from './ai-insights.service';
import { AiChatService } from './ai-chat.service';
import { AiRecommendationsService } from './ai-recommendations.service';
import { AiContentService } from './ai-content.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService, AiProductService, AiInsightsService,
    AiChatService, AiRecommendationsService, AiContentService,
  ],
  exports: [AiService, AiProductService, AiInsightsService, AiChatService, AiRecommendationsService],
})
export class AiModule {}
