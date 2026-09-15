import { Injectable, Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AiProductService {
  private readonly logger = new Logger(AiProductService.name);

  constructor(private ai: AiService, private prisma: PrismaService) {}

  async generateDescription(productData: {
    name: string;
    category: string;
    brand?: string;
    ingredients?: string[];
    skinTypes?: string[];
    concerns?: string[];
    existingDescription?: string;
  }): Promise<{ description: string; shortDescription: string; highlights: string[] }> {
    const prompt = `You are an expert cosmetics copywriter. Generate a compelling product description for:

Product: ${productData.name}
Category: ${productData.category}
Brand: ${productData.brand || 'Generic'}
Ingredients: ${productData.ingredients?.join(', ') || 'Not specified'}
Skin Types: ${productData.skinTypes?.join(', ') || 'All skin types'}
Concerns: ${productData.concerns?.join(', ') || 'General care'}

Generate a JSON response with:
- description: Detailed HTML product description (200-300 words)
- shortDescription: Brief summary (50-80 words)  
- highlights: Array of 5 key product benefits

Respond ONLY with valid JSON.`;

    const result = await this.ai.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 800, temperature: 0.7, jsonMode: true },
    );

    try {
      return JSON.parse(result);
    } catch {
      return {
        description: result,
        shortDescription: result.substring(0, 200),
        highlights: [],
      };
    }
  }

  async generateSeoMetadata(productData: {
    name: string;
    description: string;
    category: string;
    brand?: string;
  }): Promise<{ metaTitle: string; metaDescription: string; keywords: string[] }> {
    const prompt = `Generate SEO metadata for a cosmetics product:

Product: ${productData.name}
Category: ${productData.category}
Brand: ${productData.brand || ''}
Description: ${productData.description.substring(0, 300)}

Generate JSON with:
- metaTitle: SEO title (50-60 chars)
- metaDescription: Meta description (150-160 chars)
- keywords: Array of 10 relevant keywords

Respond ONLY with valid JSON.`;

    const result = await this.ai.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 400, temperature: 0.5, jsonMode: true },
    );

    try { return JSON.parse(result); }
    catch { return { metaTitle: productData.name, metaDescription: '', keywords: [] }; }
  }

  async generateTags(productName: string, description: string, category: string): Promise<string[]> {
    const prompt = `Generate 15 relevant tags for this cosmetics product:
Product: ${productName}
Category: ${category}
Description: ${description.substring(0, 200)}
Return ONLY a JSON array of tag strings.`;

    const result = await this.ai.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 200, temperature: 0.5, jsonMode: true },
    );

    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : parsed.tags || [];
    } catch { return []; }
  }

  async suggestCategory(productName: string, description: string): Promise<string> {
    const prompt = `Categorize this cosmetics product into one of: Skincare, Makeup, Haircare, Fragrance, Body Care, Nail Care, Tools & Accessories.

Product: ${productName}
Description: ${description.substring(0, 200)}

Return ONLY the category name.`;

    return this.ai.complete([{ role: 'user', content: prompt }], { maxTokens: 20, temperature: 0.3 });
  }

  async summarizeIngredients(ingredients: string[]): Promise<{
    summary: string;
    keyIngredients: { name: string; benefit: string }[];
    concerns: string[];
  }> {
    const prompt = `Analyze these cosmetics ingredients and provide a consumer-friendly summary:
Ingredients: ${ingredients.join(', ')}

Generate JSON with:
- summary: Plain English explanation (100-150 words)
- keyIngredients: Array of {name, benefit} for top 5 ingredients
- concerns: Array of potential allergens or concerns

Respond ONLY with valid JSON.`;

    const result = await this.ai.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 500, temperature: 0.4, jsonMode: true },
    );

    try { return JSON.parse(result); }
    catch { return { summary: '', keyIngredients: [], concerns: [] }; }
  }

  async detectDuplicates(productName: string, description: string, vendorId: string): Promise<{
    isDuplicate: boolean;
    similarProducts: string[];
    confidence: number;
  }> {
    const existingProducts = await this.prisma.product.findMany({
      where: { vendorId, status: { not: 'ARCHIVED' } },
      select: { id: true, name: true },
      take: 50,
    });

    if (!existingProducts.length) return { isDuplicate: false, similarProducts: [], confidence: 0 };

    const productList = existingProducts.map(p => `${p.id}: ${p.name}`).join('\n');
    const prompt = `Is this a potential duplicate of existing products?

New Product: ${productName}
Existing products:
${productList}

Respond ONLY with JSON: { "isDuplicate": boolean, "similarProducts": ["id1","id2"], "confidence": 0-1 }`;

    const result = await this.ai.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 200, temperature: 0.2, jsonMode: true },
    );

    try { return JSON.parse(result); }
    catch { return { isDuplicate: false, similarProducts: [], confidence: 0 }; }
  }

  async enhanceProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { brand: true, categories: { include: { category: true } } },
    });
    if (!product) throw new Error('Product not found');

    const category = product.categories[0]?.category.name || 'Beauty';
    const [description, seo, tags] = await Promise.all([
      this.generateDescription({
        name: product.name,
        category,
        brand: product.brand?.name,
        ingredients: product.ingredients as string[] || [],
        skinTypes: product.skinTypes,
        concerns: product.concerns,
      }),
      this.generateSeoMetadata({ name: product.name, description: product.description || '', category }),
      this.generateTags(product.name, product.description || '', category),
    ]);

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        aiGeneratedDesc: description.description,
        aiGeneratedTags: tags,
        aiMetadata: { description, seo, tags, enhancedAt: new Date() } as any,
        seoConfig: seo as any,
      },
    });

    return { description, seo, tags };
  }
}
