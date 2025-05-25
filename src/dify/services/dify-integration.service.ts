import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { firstValueFrom } from 'rxjs';

import { PdfDocument } from '../../database/entities/pdf-document.entity';
import { TextSegment } from '../../database/entities/text-segment.entity';
import { SyncToDifyDto, DifyDocumentDto } from '../dto/dify.dto';

@Injectable()
export class DifyIntegrationService {
  private readonly difyApiUrl: string;
  private readonly difyApiKey: string;
  private readonly difyKnowledgeBaseId: string;

  constructor(
    @InjectRepository(PdfDocument)
    private pdfDocumentRepository: Repository<PdfDocument>,
    @InjectRepository(TextSegment)
    private textSegmentRepository: Repository<TextSegment>,
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.difyApiUrl = this.configService.get('DIFY_API_BASE_URL', 'https://api.dify.ai');
    this.difyApiKey = this.configService.get('DIFY_API_KEY');
    this.difyKnowledgeBaseId = this.configService.get('DIFY_KNOWLEDGE_BASE_ID');
  }

  /**
   * 将PDF文档分段同步到Dify知识库
   */
  async syncDocumentToDify(dto: SyncToDifyDto): Promise<{
    success: boolean;
    difyDocuments: DifyDocumentDto[];
    message: string;
  }> {
    this.logger.info('开始同步文档到Dify', { documentId: dto.documentId });

    try {
      // 验证文档存在且处理完成
      const document = await this.pdfDocumentRepository.findOne({
        where: { id: dto.documentId },
        relations: ['segments'],
      });

      if (!document) {
        throw new NotFoundException('PDF文档不存在');
      }

      if (document.status !== 'completed') {
        throw new BadRequestException('PDF文档尚未处理完成');
      }

      // 获取未同步的分段
      const unsynced = document.segments.filter(s => !s.syncedToDify);
      
      if (unsynced.length === 0) {
        return {
          success: true,
          difyDocuments: [],
          message: '所有分段已经同步到Dify',
        };
      }

      // 批量同步分段到Dify
      const difyDocuments: DifyDocumentDto[] = [];
      const batchSize = 10; // 每批处理10个分段

      for (let i = 0; i < unsynced.length; i += batchSize) {
        const batch = unsynced.slice(i, i + batchSize);
        const batchResults = await this.syncSegmentBatch(batch, document, dto);
        difyDocuments.push(...batchResults);
      }

      this.logger.info('文档同步完成', {
        documentId: dto.documentId,
        syncedCount: difyDocuments.length,
      });

      return {
        success: true,
        difyDocuments,
        message: `成功同步 ${difyDocuments.length} 个分段到Dify`,
      };
    } catch (error) {
      this.logger.error('文档同步失败', {
        documentId: dto.documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 批量同步分段
   */
  private async syncSegmentBatch(
    segments: TextSegment[],
    document: PdfDocument,
    dto: SyncToDifyDto,
  ): Promise<DifyDocumentDto[]> {
    const results: DifyDocumentDto[] = [];

    for (const segment of segments) {
      try {
        const difyDoc = await this.createDifyDocument(segment, document, dto);
        
        // 更新分段状态
        segment.syncedToDify = true;
        segment.difyDocumentId = difyDoc.id;
        await this.textSegmentRepository.save(segment);

        results.push(difyDoc);
      } catch (error) {
        this.logger.error('分段同步失败', {
          segmentId: segment.id,
          error: error.message,
        });
        // 继续处理下一个分段
      }
    }

    return results;
  }

  /**
   * 创建Dify文档
   */
  private async createDifyDocument(
    segment: TextSegment,
    document: PdfDocument,
    dto: SyncToDifyDto,
  ): Promise<DifyDocumentDto> {
    const knowledgeBaseId = dto.knowledgeBaseId || this.difyKnowledgeBaseId;
    
    const payload = {
      name: `${document.originalName}_segment_${segment.segmentIndex}`,
      text: segment.content,
      metadata: {
        source: 'pdf-dify-integration',
        documentId: document.id,
        segmentIndex: segment.segmentIndex,
        originalFilename: document.originalName,
        pageRange: `${segment.startPage}-${segment.endPage}`,
        characterCount: segment.characterCount,
        tokenCount: segment.wordCount, // Using wordCount as token approximation
        ...segment.metadata,
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.difyApiUrl}/v1/datasets/${knowledgeBaseId}/documents`,
          payload,
          {
            headers: {
              'Authorization': `Bearer ${this.difyApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return (response as any).data;
    } catch (error) {
      this.logger.error('创建Dify文档失败', {
        segmentId: segment.id,
        error: error.response?.data || error.message,
      });
      throw new BadRequestException(`创建Dify文档失败: ${error.message}`);
    }
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus(documentId: string): Promise<{
    documentId: string;
    syncedSegments: number;
    totalSegments: number;
    lastSyncAt: Date;
    status: string;
  }> {
    const document = await this.pdfDocumentRepository.findOne({
      where: { id: documentId },
      relations: ['segments'],
    });

    if (!document) {
      throw new NotFoundException('PDF文档不存在');
    }

    const syncedSegments = document.segments.filter(s => s.syncedToDify);
    const lastSyncedSegment = syncedSegments
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    let status = 'not_synced';
    if (syncedSegments.length === document.segments.length) {
      status = 'fully_synced';
    } else if (syncedSegments.length > 0) {
      status = 'partially_synced';
    }

    return {
      documentId,
      syncedSegments: syncedSegments.length,
      totalSegments: document.segments.length,
      lastSyncAt: lastSyncedSegment?.createdAt || null,
      status,
    };
  }

  /**
   * 重新同步文档
   */
  async resyncDocument(documentId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    // 重置所有分段的同步状态
    await this.textSegmentRepository.update(
      { documentId },
      { syncedToDify: false, difyDocumentId: null },
    );

    // 重新同步
    await this.syncDocumentToDify({ documentId });

    return {
      success: true,
      message: '重新同步完成',
    };
  }

  /**
   * 测试Dify连接
   */
  async testConnection(): Promise<{
    status: string;
    timestamp: string;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.difyApiUrl}/v1/datasets`, {
          headers: {
            'Authorization': `Bearer ${this.difyApiKey}`,
          },
          timeout: 5000,
        }),
      );

      return {
        status: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Dify连接测试失败', { error: error.message });
      return {
        status: 'disconnected',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 删除Dify文档
   */
  async deleteDifyDocument(difyDocumentId: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.httpService.delete(
          `${this.difyApiUrl}/v1/datasets/${this.difyKnowledgeBaseId}/documents/${difyDocumentId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.difyApiKey}`,
            },
          },
        ),
      );
      return true;
    } catch (error) {
      this.logger.error('删除Dify文档失败', {
        difyDocumentId,
        error: error.message,
      });
      return false;
    }
  }
}
