import { Injectable } from '@nestjs/common';
import { AiService } from './ai.service';

@Injectable()
export class AiContentService {
  constructor(private ai: AiService) {}

  async generateBlogPost(topic: string, keywords: string[], length: 'short' | 'medium' | 'long' = 'medium'): Promise<{
    title: string;
    content: string;
    excerpt: string;
    tags: string[];
    seoTitle: string;
    seoDesc: string;
  }> {
    const wordCount = length === 'short' ? 500 : length === 'medium' ? 1000 : 1500;
    const prompt = `Write a professional beauty/cosmetics blog post:

Topic: ${topic}
Keywords to include: ${keywords.join(', ')}
Target length: ~${wordCount} words

Generate JSON:
{
  "title": "engaging blog title",
  "content": "full blog post in HTML format",
  "excerpt": "150-word summary",
  "tags": ["tag1", "tag2", ...],
  "seoTitle": "SEO optimized title",
  "seoDesc": "meta description 150-160 chars"
}

Respond ONLY with valid JSON.`;

    const result = await this.ai.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 2000, temperature: 0.8, jsonMode: true },
    );

    try { return JSON.parse(result); }
    catch { return { title: topic, content: result, excerpt: '', tags: [], seoTitle: topic, seoDesc: '' }; }
  }

  async generateEmailCampaign(campaign: {
    type: 'promotional' | 'newsletter' | 'winback' | 'welcome';
    productName?: string;
    discount?: number;
    customerName?: string;
  }): Promise<{ subject: string; previewText: string; htmlBody: string }> {
    const prompt = `Generate a professional marketing email for a cosmetics brand:

Campaign Type: ${campaign.type}
${campaign.productName ? `Featured Product: ${campaign.productName}` : ''}
${campaign.discount ? `Discount: ${campaign.discount}%` : ''}
Customer Name: ${campaign.customerName || '[Customer Name]'}

Generate JSON:
{
  "subject": "compelling email subject line",
  "previewText": "preview text (90 chars)",
  "htmlBody": "professional HTML email body"
}`;

    const result = await this.ai.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 1000, temperature: 0.8, jsonMode: true },
    );

    try { return JSON.parse(result); }
    catch { return { subject: 'Special Offer', previewText: '', htmlBody: result }; }
  }

  async generateProductReviewSummary(reviews: { rating: number; body: string }[]): Promise<{
    summary: string;
    pros: string[];
    cons: string[];
    overallSentiment: 'positive' | 'neutral' | 'negative';
  }> {
    const reviewText = reviews.slice(0, 20).map(r => `[${r.rating}/5]: ${r.body}`).join('\n');

    const prompt = `Summarize these product reviews:
${reviewText}

Generate JSON:
{
  "summary": "2-3 sentence summary",
  "pros": ["pro1", "pro2", "pro3"],
  "cons": ["con1", "con2"],
  "overallSentiment": "positive|neutral|negative"
}`;

    const result = await this.ai.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 400, temperature: 0.4, jsonMode: true },
    );

    try { return JSON.parse(result); }
    catch { return { summary: '', pros: [], cons: [], overallSentiment: 'neutral' }; }
  }
}
