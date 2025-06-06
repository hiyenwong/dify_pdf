import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { PdfDocument } from '../../database/entities/pdf-document.entity';
import { TextSegment } from '../../database/entities/text-segment.entity';
import { 
  KnowledgeBaseQueryDto,
  DifyKnowledgeBaseResponseDto,
  DifyRetrievalRequestDto,
  DifyRetrievalResponseDto,
  DifyRetrievalRecordDto,
} from '../dto/dify.dto';

@Injectable()
export class DifyKnowledgeBaseService {
  constructor(
    @InjectRepository(PdfDocument)
    private pdfDocumentRepository: Repository<PdfDocument>,
    @InjectRepository(TextSegment)
    private textSegmentRepository: Repository<TextSegment>,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 作为Dify知识库外部数据源的接口实现
   */
  async getExternalData(
    documentId: string,
    page: number,
    limit: number,
    difySource?: string,
  ): Promise<{
    data: Array<{
      id: string;
      content: string;
      metadata: Record<string, any>;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
    };
  }> {
    this.logger.info('Dify请求外部数据', {
      documentId,
      page,
      limit,
      source: difySource,
    });

    const [segments, total] = await this.textSegmentRepository.findAndCount({
      where: { documentId },
      order: { segmentIndex: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['document'],
    });

    const data = segments.map(segment => ({
      id: segment.id,
      content: segment.content,
      metadata: {
        documentId: segment.documentId,
        segmentIndex: segment.segmentIndex,
        originalFilename: segment.document?.originalName || '',
        pageRange: `${segment.startPage}-${segment.endPage}`,
        characterCount: segment.characterCount,
        tokenCount: segment.wordCount, // Using wordCount as token approximation
        createdAt: segment.createdAt.toISOString(),
        ...segment.metadata,
      },
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        hasNext: page * limit < total,
      },
    };
  }

  /**
   * 在知识库中进行语义搜索
   */
  async searchKnowledgeBase(dto: KnowledgeBaseQueryDto): Promise<{
    results: Array<{
      content: string;
      score: number;
      documentId: string;
      segmentIndex: number;
      metadata: Record<string, any>;
    }>;
    query: string;
    totalResults: number;
  }> {
    this.logger.info('知识库搜索', { query: dto.query });

    // 简化版本的文本搜索（实际项目中可以集成向量数据库如Pinecone、Weaviate等）
    const searchTerms = dto.query.toLowerCase().split(/\s+/);
    const limit = dto.limit || 5;

    const queryBuilder = this.textSegmentRepository
      .createQueryBuilder('segment')
      .leftJoinAndSelect('segment.document', 'document')
      .where('segment.status = :status', { status: 'processed' });

    // 简单的关键词匹配
    searchTerms.forEach((term, index) => {
      queryBuilder.andWhere(
        `LOWER(segment.content) LIKE :term${index}`,
        { [`term${index}`]: `%${term}%` },
      );
    });

    const segments = await queryBuilder
      .orderBy('segment.characterCount', 'DESC')
      .limit(limit * 2) // 获取更多结果用于评分
      .getMany();

    // 计算相似度分数（简化版本）
    const results = segments.map(segment => {
      const score = this.calculateSimilarity(segment.content, dto.query);
      return {
        content: segment.content,
        score,
        documentId: segment.documentId,
        segmentIndex: segment.segmentIndex,
        metadata: {
          originalFilename: segment.document?.originalName || '',
          pageRange: `${segment.startPage}-${segment.endPage}`,
          characterCount: segment.characterCount,
          tokenCount: segment.wordCount, // Using wordCount as token approximation
          ...segment.metadata,
        },
      };
    })
    .filter(result => result.score >= (dto.similarity_threshold || 0.3))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

    return {
      results,
      query: dto.query,
      totalResults: results.length,
    };
  }

  /**
   * 获取已同步到Dify的文档列表
   */
  async getSyncedDocuments(
    page: number,
    limit: number,
  ): Promise<{
    documents: DifyKnowledgeBaseResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.pdfDocumentRepository
      .createQueryBuilder('document')
      .leftJoin('document.segments', 'segment')
      .where('segment.syncedToDify = :synced', { synced: true })
      .groupBy('document.id')
      .orderBy('document.updatedAt', 'DESC');

    const [documents, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const documentsWithStats = await Promise.all(
      documents.map(async (doc) => {
        const segmentCount = await this.textSegmentRepository.count({
          where: { documentId: doc.id, syncedToDify: true },
        });

        return {
          id: doc.id,
          name: doc.originalName,
          description: `PDF文档，${doc.totalPages}页，${segmentCount}个分段已同步`,
          document_count: segmentCount,
          created_at: doc.createdAt.toISOString(),
        };
      }),
    );

    return {
      documents: documentsWithStats,
      total,
      page,
      limit,
    };
  }

  /**
   * 获取知识库统计信息
   */
  async getKnowledgeBaseStats(): Promise<{
    totalDocuments: number;
    totalSegments: number;
    syncedDocuments: number;
    avgSegmentsPerDocument: number;
    lastSyncTime: string;
  }> {
    const totalDocuments = await this.pdfDocumentRepository.count({
      where: { status: 'completed' },
    });

    const totalSegments = await this.textSegmentRepository.count();

    const syncedSegmentsCount = await this.textSegmentRepository.count({
      where: { syncedToDify: true },
    });

    const syncedDocumentsCount = await this.pdfDocumentRepository
      .createQueryBuilder('document')
      .leftJoin('document.segments', 'segment')
      .where('segment.syncedToDify = :synced', { synced: true })
      .getCount();

    const lastSyncedSegment = await this.textSegmentRepository.findOne({
      where: { syncedToDify: true },
      order: { createdAt: 'DESC' },
    });

    return {
      totalDocuments,
      totalSegments,
      syncedDocuments: syncedDocumentsCount,
      avgSegmentsPerDocument: totalDocuments > 0 ? totalSegments / totalDocuments : 0,
      lastSyncTime: lastSyncedSegment?.createdAt.toISOString() || 'never',
    };
  }

  /**
   * 处理Dify Webhook
   */
  async handleDifyWebhook(
    payload: any,
    headers: Record<string, string>,
  ): Promise<{
    status: string;
    message: string;
    timestamp: string;
  }> {
    this.logger.info('收到Dify Webhook', {
      payload,
      headers: Object.keys(headers),
    });

    try {
      // 验证webhook签名（如果需要）
      const signature = headers['x-dify-signature'];
      if (signature) {
        // 这里应该验证签名的有效性
        this.logger.info('Webhook签名验证', { signature });
      }

      // 处理不同类型的webhook事件
      switch (payload.event) {
        case 'document.created':
          await this.handleDocumentCreated(payload.data);
          break;
        case 'document.updated':
          await this.handleDocumentUpdated(payload.data);
          break;
        case 'document.deleted':
          await this.handleDocumentDeleted(payload.data);
          break;
        default:
          this.logger.warn('未知的webhook事件类型', { event: payload.event });
      }

      return {
        status: 'success',
        message: 'Webhook处理成功',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Webhook处理失败', { error: error.message });
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 处理文档创建事件
   */
  private async handleDocumentCreated(data: any): Promise<void> {
    this.logger.info('处理文档创建事件', { documentId: data.id });
    // 这里可以添加相应的业务逻辑
  }

  /**
   * 处理文档更新事件
   */
  private async handleDocumentUpdated(data: any): Promise<void> {
    this.logger.info('处理文档更新事件', { documentId: data.id });
    // 这里可以添加相应的业务逻辑
  }

  /**
   * 处理文档删除事件
   */
  private async handleDocumentDeleted(data: any): Promise<void> {
    this.logger.info('处理文档删除事件', { documentId: data.id });
    
    // 更新本地分段状态
    if (data.metadata?.documentId) {
      await this.textSegmentRepository.update(
        { 
          documentId: data.metadata.documentId,
          difyDocumentId: data.id,
        },
        { 
          syncedToDify: false,
          difyDocumentId: null,
        },
      );
    }
  }

  /**
   * 简化的相似度计算
   */
  private calculateSimilarity(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);
    
    let matchCount = 0;
    let totalTerms = queryTerms.length;
    
    queryTerms.forEach(term => {
      if (textLower.includes(term)) {
        matchCount++;
      }
    });
    
    // 计算基础匹配度
    const basicScore = matchCount / totalTerms;
    
    // 考虑文本长度的权重（较短的匹配文本可能更相关）
    const lengthFactor = Math.min(1, 1000 / text.length);
    
    return basicScore * 0.8 + lengthFactor * 0.2;
  }

  /**
   * 执行Dify外部知识库检索
   */
  async performRetrieval(
    dto: DifyRetrievalRequestDto,
  ): Promise<DifyRetrievalResponseDto> {
    this.logger.info('执行Dify外部知识库检索', {
      knowledge_id: dto.knowledge_id,
      query: dto.query,
      top_k: dto.retrieval_setting.top_k,
      score_threshold: dto.retrieval_setting.score_threshold,
    });

    // 验证知识库是否存在
    await this.validateKnowledgeBase(dto.knowledge_id);

    try {
      // 执行文本搜索
      const searchResults = await this.searchTextSegments(
        dto.query,
        dto.retrieval_setting.top_k,
        dto.retrieval_setting.score_threshold,
        dto.metadata_condition,
      );

      // 转换为Dify格式的响应
      const records: DifyRetrievalRecordDto[] = searchResults.map(segment => ({
        content: segment.content,
        score: this.calculateSimilarity(segment.content, dto.query),
        title: segment.document?.title || `文档片段 ${segment.segmentIndex}`,
        metadata: {
          document_id: segment.documentId,
          segment_index: segment.segmentIndex,
          start_page: segment.startPage,
          end_page: segment.endPage,
          segmentation_type: segment.segmentationType,
          word_count: segment.wordCount,
          character_count: segment.characterCount,
          path: segment.document?.filePath || '',
          created_at: segment.createdAt?.toISOString(),
          ...segment.metadata,
        },
      }));

      // 按相似度分数过滤和排序
      const filteredRecords = records
        .filter(record => record.score >= dto.retrieval_setting.score_threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, dto.retrieval_setting.top_k);

      return {
        records: filteredRecords,
      };

    } catch (error) {
      this.logger.error('检索过程中发生错误', {
        error: error.message,
        knowledge_id: dto.knowledge_id,
        query: dto.query,
      });

      throw new HttpException(
        {
          error_code: 500,
          error_msg: '检索过程中发生内部错误'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 验证知识库是否存在
   */
  private async validateKnowledgeBase(knowledgeId: string): Promise<void> {
    // 这里可以实现知识库存在性验证
    // 目前简单验证是否有相关的文档数据
    
    const documentCount = await this.pdfDocumentRepository.count();
    
    if (documentCount === 0) {
      throw new HttpException(
        {
          error_code: 2001,
          error_msg: '知识库不存在'
        },
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * 搜索文本分段（支持元数据过滤）
   */
  private async searchTextSegments(
    query: string,
    topK: number,
    scoreThreshold: number,
    metadataCondition?: any,
  ): Promise<TextSegment[]> {
    const queryBuilder = this.textSegmentRepository
      .createQueryBuilder('segment')
      .leftJoinAndSelect('segment.document', 'document')
      .where('segment.content LIKE :query', { query: `%${query}%` });

    // 应用元数据过滤条件
    if (metadataCondition?.conditions) {
      this.applyMetadataFilters(queryBuilder, metadataCondition);
    }

    // 限制结果数量（实际项目中应该使用向量搜索）
    const results = await queryBuilder
      .orderBy('segment.createdAt', 'DESC')
      .limit(topK * 2) // 获取更多结果用于后续过滤
      .getMany();

    return results;
  }

  /**
   * 应用元数据过滤条件
   */
  private applyMetadataFilters(queryBuilder: any, metadataCondition: any): void {
    const { logical_operator = 'and', conditions } = metadataCondition;
    
    conditions.forEach((condition: any, index: number) => {
      const { name, comparison_operator, value } = condition;
      const paramName = `metaValue${index}`;
      
      // 这里简化处理，实际项目中需要根据具体的元数据结构来实现
      switch (comparison_operator) {
        case 'contains':
          if (logical_operator === 'and') {
            queryBuilder.andWhere(`segment.metadata::text LIKE :${paramName}`, { [paramName]: `%${value}%` });
          } else {
            queryBuilder.orWhere(`segment.metadata::text LIKE :${paramName}`, { [paramName]: `%${value}%` });
          }
          break;
        case 'is':
          if (logical_operator === 'and') {
            queryBuilder.andWhere(`segment.metadata->>'${name[0]}' = :${paramName}`, { [paramName]: value });
          } else {
            queryBuilder.orWhere(`segment.metadata->>'${name[0]}' = :${paramName}`, { [paramName]: value });
          }
          break;
        // 可以根据需要添加更多操作符
      }
    });
  }
}
