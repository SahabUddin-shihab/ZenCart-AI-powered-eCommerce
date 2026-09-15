import { Injectable } from '@nestjs/common';
import { AiService } from './ai.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AiChatService {
  constructor(private ai: AiService, private prisma: PrismaService) {}

  async chat(userId: string, sessionId: string, message: string): Promise<string> {
    // Load conversation history
    const history = await this.prisma.chatMessage.findMany({
      where: { userId, sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    // Load user profile for personalization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, skinType: true, skinConcerns: true },
    });

    const messages: any[] = [
      {
        role: 'system',
        content: `You are AIeCom's AI beauty assistant. You help customers with:
- Product recommendations based on skin type and concerns
- Skincare routines and beauty tips
- Order tracking and support
- Shade matching and color advice

Customer Name: ${user?.firstName || 'Customer'}
Skin Type: ${user?.skinType || 'Unknown'}
Skin Concerns: ${user?.skinConcerns?.join(', ') || 'Not specified'}

Be friendly, knowledgeable about cosmetics, and always suggest relevant products from our catalog when appropriate.`,
      },
      ...history.map(m => ({ role: m.role as any, content: m.content })),
      { role: 'user', content: message },
    ];

    const response = await this.ai.complete(messages, { maxTokens: 500, temperature: 0.8 });

    // Save messages
    await this.prisma.chatMessage.createMany({
      data: [
        { userId, sessionId, role: 'user', content: message, isAi: false },
        { userId, sessionId, role: 'assistant', content: response, isAi: true },
      ],
    });

    return response;
  }

  async getBeautyRecommendation(userId: string, query: string): Promise<{
    advice: string;
    recommendedProducts: any[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { skinType: true, skinConcerns: true, preferredShades: true },
    });

    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, price: true, skinTypes: true, concerns: true, images: true },
      take: 20,
    });

    const prompt = `As a beauty consultant, provide personalized advice:

Customer Query: ${query}
Skin Type: ${user?.skinType || 'Unknown'}
Skin Concerns: ${user?.skinConcerns?.join(', ') || 'None specified'}

Available products: ${JSON.stringify(products.slice(0, 10))}

Respond with JSON: {
  "advice": "personalized beauty advice (150 words)",
  "recommendedProductIds": ["id1", "id2", "id3"]
}`;

    const result = await this.ai.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 600, temperature: 0.7, jsonMode: true },
    );

    try {
      const parsed = JSON.parse(result);
      const recommendedProducts = products.filter(p => parsed.recommendedProductIds?.includes(p.id));
      return { advice: parsed.advice, recommendedProducts };
    } catch {
      return { advice: result, recommendedProducts: [] };
    }
  }

  async matchShade(skinTone: string, productType: string): Promise<string[]> {
    const prompt = `Recommend shade names for:
Skin Tone: ${skinTone}
Product Type: ${productType}

Return ONLY a JSON array of 5 shade recommendations with hex codes:
[{ "name": "shade name", "hex": "#ffffff", "undertone": "warm/cool/neutral" }]`;

    const result = await this.ai.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 300, temperature: 0.5, jsonMode: true },
    );

    try { return JSON.parse(result); } catch { return []; }
  }

  async generateSkinRoutine(profile: {
    skinType: string;
    concerns: string[];
    budget?: number;
  }): Promise<{ routine: any; steps: any[] }> {
    const prompt = `Create a personalized skincare routine:
Skin Type: ${profile.skinType}
Concerns: ${profile.concerns.join(', ')}
Budget: ${profile.budget ? `${profile.budget} BDT` : 'Any'}

Generate JSON: {
  "routine": { "name": "...", "description": "..." },
  "steps": [{ "step": number, "time": "AM/PM/Both", "product_type": "...", "how_to": "..." }]
}`;

    const result = await this.ai.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 600, temperature: 0.7, jsonMode: true },
    );

    try { return JSON.parse(result); } catch { return { routine: {}, steps: [] }; }
  }
}
