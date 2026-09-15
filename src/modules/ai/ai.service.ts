import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  private model: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
    this.model = config.get('OPENAI_MODEL', 'gpt-4o');
  }

  async complete(messages: OpenAI.Chat.ChatCompletionMessageParam[], options?: {
    maxTokens?: number;
    temperature?: number;
    jsonMode?: boolean;
    promptKey?: string;
  }): Promise<string> {
    try {
      // Check for dynamic prompt override
      if (options?.promptKey) {
        const tmpl = await this.getPromptTemplate(options.promptKey);
        if (tmpl) {
          this.model = (tmpl as any).model || this.model;
        }
      }

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: options?.maxTokens || this.config.get<number>('OPENAI_MAX_TOKENS', 1000),
        temperature: options?.temperature ?? this.config.get<number>('OPENAI_TEMPERATURE', 0.7),
        response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error('OpenAI API error:', error.message);
      throw error;
    }
  }

  async createEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.config.get('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
      input: text,
    });
    return response.data[0].embedding;
  }

  async getPromptTemplate(key: string) {
    const cacheKey = `ai:prompt:${key}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const template = await this.prisma.aiPromptTemplate.findUnique({
      where: { key, isActive: true },
    });
    if (template) await this.redis.set(cacheKey, template, 3600);
    return template;
  }

  async renderPrompt(key: string, variables: Record<string, any>): Promise<string> {
    const template = await this.getPromptTemplate(key);
    if (!template) throw new Error(`Prompt template not found: ${key}`);
    let rendered = (template as any).template as string;
    for (const [k, v] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    }
    return rendered;
  }

  async streamComplete(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    onChunk: (chunk: string) => void,
  ) {
    const stream = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      stream: true,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) onChunk(content);
    }
  }
}
