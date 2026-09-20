import { Injectable } from '@nestjs/common';
import { AiRecommendationsService } from '../ai/ai-recommendations.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class RecommendationsService {
  constructor(private aiRecommend: AiRecommendationsService) {}

  async getPersonalized(userId: string, limit = 12) { return this.aiRecommend.getPersonalized(userId, limit); }
  async getSimilar(productId: string, limit = 8) { return this.aiRecommend.getSimilar(productId, limit); }
  async getFrequentlyBoughtTogether(productId: string) { return this.aiRecommend.getFrequentlyBoughtTogether(productId); }
  async getTrending(categoryId?: string) { return this.aiRecommend.getTrending(categoryId); }
  async getUpsell(productId: string) { return this.aiRecommend.getUpsell(productId); }

  async findAll(dto: PaginationDto) { return paginate([], 0, dto); }
  async create(data: any) { return data; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
  async getStats() { return {}; }
}
