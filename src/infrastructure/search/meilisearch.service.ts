import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Meilisearch, Index } from 'meilisearch';

@Injectable()
export class MeiliSearchService implements OnModuleInit {
  private readonly logger = new Logger(MeiliSearchService.name);
  private client: Meilisearch;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.client = new Meilisearch({
      host: this.config.get('MEILI_HOST', 'http://localhost:7700'),
      apiKey: this.config.get('MEILI_API_KEY', 'masterKey'),
    });
    await this.setupIndexes();
  }

  private async setupIndexes() {
    try {
      await this.client.createIndex('products', { primaryKey: 'id' });
      await this.client.index('products').updateSettings({
        searchableAttributes: ['name', 'description', 'tags', 'brand', 'category'],
        filterableAttributes: ['status', 'vendorId', 'brandId', 'price', 'rating', 'skinTypes'],
        sortableAttributes: ['price', 'rating', 'soldCount', 'createdAt'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
      });
      await this.client.createIndex('vendors', { primaryKey: 'id' });
      await this.client.createIndex('blogs', { primaryKey: 'id' });
      this.logger.log('Search indexes configured');
    } catch (e) {
      this.logger.warn('Search index setup skipped (Meilisearch may not be running)');
    }
  }

  async indexDocument(indexName: string, document: object): Promise<void> {
    try {
      await this.client.index(indexName).addDocuments([document]);
    } catch (e) {
      this.logger.warn(`Search index failed for ${indexName}`);
    }
  }

  async indexDocuments(indexName: string, documents: object[]): Promise<void> {
    try {
      await this.client.index(indexName).addDocuments(documents);
    } catch (e) {
      this.logger.warn(`Bulk search index failed for ${indexName}`);
    }
  }

  async search(indexName: string, query: string, options?: any) {
    try {
      return await this.client.index(indexName).search(query, options);
    } catch (e) {
      this.logger.warn(`Search failed for ${indexName}`);
      return { hits: [], estimatedTotalHits: 0 };
    }
  }

  async deleteDocument(indexName: string, documentId: string): Promise<void> {
    try {
      await this.client.index(indexName).deleteDocument(documentId);
    } catch (e) {}
  }

  async updateDocument(indexName: string, document: object): Promise<void> {
    try {
      await this.client.index(indexName).updateDocuments([document]);
    } catch (e) {}
  }
}
