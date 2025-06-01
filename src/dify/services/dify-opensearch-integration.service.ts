import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenSearchService, SearchDocument } from '../../opensearch/opensearch.service';
import { PdfDocument } from '../../database/entities/pdf-document.entity';
import { TextSegment } from '../../database/entities/text-segment.entity';
import { 
  KnowledgeBaseQueryDto, 
  KnowledgeBaseQueryResultDto,
  OpenSearchSyncStatusDto 
} from '../dto/knowledge-base.dto';

@Injectable()
export class DifyOpenSearchIntegrationService {
  private readonly logger = new Logger(DifyOpenSearchIntegrationService.name);

  constructor(
    private readonly openSearchService: OpenSearchService,
    @InjectRepository(PdfDocument)
    private readonly pdfDocumentRepository: Repository<PdfDocument>,
    @InjectRepository(TextSegment)
    private readonly textSegmentRepository: Repository<TextSegment>,
  ) {}

  async syncPdfToOpenSearch(pdfDocumentId: string, force: boolean = false): Promise<{
    success: boolean;
    syncedSegments: number;
    message: string;
  }> {
    try {
      // 获取PDF文档
      const pdfDocument = await this.pdfDocumentRepository.findOne({
        where: { id: pdfDocumentId },
        relations: ['segments'],
      });

      if (!pdfDocument) {
        throw new Error(`PDF document not found: ${pdfDocumentId}`);
      }

      // 如果强制同步，先删除现有文档
      if (force) {
        await this.openSearchService.deleteByPdfDocumentId(pdfDocumentId);
      }

      // 准备文档数据
      const searchDocuments: SearchDocument[] = pdfDocument.segments.map(segment => ({
        id: `${pdfDocumentId}_${segment.id}`,
        pdfDocumentId: pdfDocumentId,
        title: pdfDocument.filename,
        content: segment.content,
        metadata: {
          segmentId: segment.id,
          segmentIndex: segment.segmentIndex,
          wordCount: segment.wordCount,
          pdfMetadata: pdfDocument.metadata,
          filename: pdfDocument.filename,
          fileSize: pdfDocument.fileSize,
        },
        createdAt: segment.createdAt,
        updatedAt: segment.updatedAt,
      }));

      // 批量索引到OpenSearch
      await this.openSearchService.bulkIndexDocuments(searchDocuments);

      this.logger.log(`Synced ${searchDocuments.length} segments to OpenSearch for PDF: ${pdfDocumentId}`);

      return {
        success: true,
        syncedSegments: searchDocuments.length,
        message: `Successfully synced ${searchDocuments.length} segments to OpenSearch`,
      };
    } catch (error) {
      this.logger.error(`Failed to sync PDF to OpenSearch: ${pdfDocumentId}`, error);
      return {
        success: false,
        syncedSegments: 0,
        message: `Sync failed: ${error.message}`,
      };
    }
  }

  async queryKnowledgeBase(queryDto: KnowledgeBaseQueryDto): Promise<KnowledgeBaseQueryResultDto> {
    const startTime = Date.now();

    try {
      const searchResult = await this.openSearchService.search({
        query: queryDto.query,
        size: queryDto.size,
        from: queryDto.from,
        filters: queryDto.filters,
      });

      const results = searchResult.hits.map(hit => ({
        id: hit.id,
        score: hit.score,
        title: hit.document.title,
        content: hit.document.content,
        metadata: hit.document.metadata,
        highlights: hit.highlights,
      }));

      const took = Date.now() - startTime;

      return {
        total: searchResult.total,
        results,
        took,
      };
    } catch (error) {
      this.logger.error('Knowledge base query failed:', error);
      throw error;
    }
  }

  async getSyncStatusFromOpenSearch(pdfDocumentId: string): Promise<OpenSearchSyncStatusDto> {
    try {
      const searchResult = await this.openSearchService.search({
        query: '*',
        filters: { pdfDocumentId },
        size: 1000, // 假设不会超过1000个分段
      });

      const lastIndexedAt = searchResult.hits.length > 0
        ? new Date(Math.max(...searchResult.hits.map(hit => 
            new Date(hit.document.updatedAt).getTime()
          )))
        : null;

      return {
        pdfDocumentId,
        indexedSegments: searchResult.total,
        lastIndexedAt,
        indexStatus: searchResult.total > 0 ? 'indexed' : 'not_indexed',
      };
    } catch (error) {
      this.logger.error(`Failed to get OpenSearch sync status for PDF: ${pdfDocumentId}`, error);
      return {
        pdfDocumentId,
        indexedSegments: 0,
        lastIndexedAt: null,
        indexStatus: 'error',
      };
    }
  }

  async deleteFromOpenSearch(pdfDocumentId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.openSearchService.deleteByPdfDocumentId(pdfDocumentId);
      
      return {
        success: true,
        message: `Successfully deleted all segments for PDF: ${pdfDocumentId}`,
      };
    } catch (error) {
      this.logger.error(`Failed to delete from OpenSearch: ${pdfDocumentId}`, error);
      return {
        success: false,
        message: `Delete failed: ${error.message}`,
      };
    }
  }

  async bulkSyncAllPdfsToOpenSearch(): Promise<{
    success: boolean;
    totalPdfs: number;
    syncedPdfs: number;
    failedPdfs: string[];
    message: string;
  }> {
    try {
      const allPdfs = await this.pdfDocumentRepository.find({
        relations: ['segments'],
      });

      const failedPdfs: string[] = [];
      let syncedPdfs = 0;

      for (const pdf of allPdfs) {
        try {
          await this.syncPdfToOpenSearch(pdf.id, true);
          syncedPdfs++;
        } catch (error) {
          this.logger.error(`Failed to sync PDF ${pdf.id}:`, error);
          failedPdfs.push(pdf.id);
        }
      }

      return {
        success: failedPdfs.length === 0,
        totalPdfs: allPdfs.length,
        syncedPdfs,
        failedPdfs,
        message: `Synced ${syncedPdfs}/${allPdfs.length} PDFs to OpenSearch`,
      };
    } catch (error) {
      this.logger.error('Bulk sync failed:', error);
      return {
        success: false,
        totalPdfs: 0,
        syncedPdfs: 0,
        failedPdfs: [],
        message: `Bulk sync failed: ${error.message}`,
      };
    }
  }
}
