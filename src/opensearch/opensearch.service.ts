import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';

export interface SearchDocument {
  id: string;
  pdfDocumentId: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchQuery {
  query: string;
  filters?: Record<string, any>;
  size?: number;
  from?: number;
}

export interface SearchResult {
  total: number;
  hits: Array<{
    id: string;
    score: number;
    document: SearchDocument;
    highlights?: Record<string, string[]>;
  }>;
}

@Injectable()
export class OpenSearchService {
  private readonly client: Client;
  private readonly indexPrefix: string;
  private readonly logger = new Logger(OpenSearchService.name);

  constructor(private readonly configService: ConfigService) {
    this.client = new Client({
      node: this.configService.get('OPENSEARCH_NODE', 'https://localhost:9200'),
      auth: {
        username: this.configService.get('OPENSEARCH_USERNAME', 'admin'),
        password: this.configService.get('OPENSEARCH_PASSWORD', 'admin'),
      },
      ssl: {
        rejectUnauthorized: this.configService.get('OPENSEARCH_SSL_VERIFY', false) === 'true',
      },
    });

    this.indexPrefix = this.configService.get('OPENSEARCH_INDEX_PREFIX', 'pdf_dify');
  }

  private getIndexName(type: string = 'documents'): string {
    return `${this.indexPrefix}_${type}`;
  }

  async ensureIndex(indexName?: string): Promise<void> {
    const index = indexName || this.getIndexName();
    
    try {
      const exists = await this.client.indices.exists({ index });
      
      if (!exists.body) {
        await this.client.indices.create({
          index,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                pdfDocumentId: { type: 'keyword' },
                title: { 
                  type: 'text',
                  analyzer: 'standard',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                content: { 
                  type: 'text',
                  analyzer: 'standard'
                },
                metadata: { type: 'object' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
              },
            },
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
            },
          },
        });
        
        this.logger.log(`Created index: ${index}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure index ${index}:`, error);
      throw error;
    }
  }

  async indexDocument(document: SearchDocument): Promise<void> {
    const index = this.getIndexName();
    await this.ensureIndex(index);

    try {
      await this.client.index({
        index,
        id: document.id,
        body: document,
        refresh: true,
      });

      this.logger.log(`Indexed document: ${document.id}`);
    } catch (error) {
      this.logger.error(`Failed to index document ${document.id}:`, error);
      throw error;
    }
  }

  async bulkIndexDocuments(documents: SearchDocument[]): Promise<void> {
    if (documents.length === 0) return;

    const index = this.getIndexName();
    await this.ensureIndex(index);

    const body = documents.flatMap(doc => [
      { index: { _index: index, _id: doc.id } },
      doc,
    ]);

    try {
      const response = await this.client.bulk({
        body,
        refresh: true,
      });

      if (response.body.errors) {
        this.logger.error('Bulk indexing had errors:', response.body.items);
      } else {
        this.logger.log(`Bulk indexed ${documents.length} documents`);
      }
    } catch (error) {
      this.logger.error('Failed to bulk index documents:', error);
      throw error;
    }
  }

  async search(searchQuery: SearchQuery): Promise<SearchResult> {
    const index = this.getIndexName();
    
    const query = {
      bool: {
        must: [
          {
            multi_match: {
              query: searchQuery.query,
              fields: ['title^2', 'content'],
              type: 'best_fields' as const,
              fuzziness: 'AUTO' as const,
            },
          },
        ],
        filter: [] as any[],
      },
    };

    // 添加过滤条件
    if (searchQuery.filters) {
      for (const [key, value] of Object.entries(searchQuery.filters)) {
        query.bool.filter.push({ term: { [key]: value } });
      }
    }

    try {
      const response = await this.client.search({
        index,
        body: {
          query,
          size: searchQuery.size || 10,
          from: searchQuery.from || 0,
          highlight: {
            fields: {
              title: {},
              content: {
                fragment_size: 150,
                number_of_fragments: 3,
              },
            },
          },
        },
      });

      const hits = response.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        score: hit._score,
        document: hit._source,
        highlights: hit.highlight,
      }));

      // 修复total值的类型处理
      const total = typeof response.body.hits.total === 'number' 
        ? response.body.hits.total 
        : response.body.hits.total.value;

      return {
        total,
        hits,
      };
    } catch (error) {
      this.logger.error('Search failed:', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    const index = this.getIndexName();

    try {
      await this.client.delete({
        index,
        id,
        refresh: true,
      });

      this.logger.log(`Deleted document: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete document ${id}:`, error);
      throw error;
    }
  }

  async deleteByPdfDocumentId(pdfDocumentId: string): Promise<void> {
    const index = this.getIndexName();

    try {
      await this.client.deleteByQuery({
        index,
        body: {
          query: {
            term: { pdfDocumentId },
          },
        },
        refresh: true,
      });

      this.logger.log(`Deleted documents for PDF: ${pdfDocumentId}`);
    } catch (error) {
      this.logger.error(`Failed to delete documents for PDF ${pdfDocumentId}:`, error);
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; cluster: any }> {
    try {
      const health = await this.client.cluster.health();
      return {
        status: 'connected',
        cluster: health.body,
      };
    } catch (error) {
      this.logger.error('OpenSearch health check failed:', error);
      throw error;
    }
  }
}
