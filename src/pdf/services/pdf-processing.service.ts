import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';

import { PdfDocument } from '../../database/entities/pdf-document.entity';
import { TextSegment } from '../../database/entities/text-segment.entity';
import { TextSegmentationService } from './text-segmentation.service';
import { 
  ProcessPdfDto, 
  PdfDocumentResponseDto, 
  TextSegmentResponseDto 
} from '../dto/pdf.dto';

@Injectable()
export class PdfProcessingService {
  constructor(
    @InjectRepository(PdfDocument)
    private pdfDocumentRepository: Repository<PdfDocument>,
    @InjectRepository(TextSegment)
    private textSegmentRepository: Repository<TextSegment>,
    private configService: ConfigService,
    private textSegmentationService: TextSegmentationService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 处理上传的PDF文件
   */
  async processPdf(
    file: Express.Multer.File,
    options: Omit<ProcessPdfDto, 'file'>,
  ): Promise<PdfDocumentResponseDto> {
    this.logger.info('开始处理PDF文件', { filename: file.originalname });

    try {
      // 创建PDF文档记录
      const pdfDocument = new PdfDocument();
      pdfDocument.filename = file.filename;
      pdfDocument.originalName = file.originalname;
      pdfDocument.filePath = file.path;
      pdfDocument.fileSize = file.size;
      pdfDocument.status = 'processing';

      // 解析PDF基本信息
      const pdfBuffer = fs.readFileSync(file.path);
      const pdfData = await pdfParse(pdfBuffer);
      
      pdfDocument.totalPages = pdfData.numpages;
      pdfDocument.metadata = JSON.stringify(pdfData.info || {});
      
      // 提取标题和作者
      if (pdfData.info) {
        pdfDocument.title = pdfData.info.Title || path.parse(file.originalname).name;
        pdfDocument.author = pdfData.info.Author;
      }

      // 保存文档记录
      const savedDocument = await this.pdfDocumentRepository.save(pdfDocument);

      // 异步处理文本分段
      this.processTextSegmentation(savedDocument, pdfData.text, options)
        .catch(error => {
          this.logger.error('文本分段处理失败', {
            documentId: savedDocument.id,
            error: error.message,
          });
          this.updateDocumentStatus(savedDocument.id, 'failed', error.message);
        });

      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error('PDF处理失败', {
        filename: file.originalname,
        error: error.message,
      });
      throw new BadRequestException(`PDF处理失败: ${error.message}`);
    }
  }

  /**
   * 异步处理文本分段
   */
  private async processTextSegmentation(
    document: PdfDocument,
    text: string,
    options: Omit<ProcessPdfDto, 'file'>,
  ): Promise<void> {
    try {
      const chunkSize = options.chunkSize || this.configService.get('DEFAULT_CHUNK_SIZE', 1000);
      const overlapSize = options.overlapSize || this.configService.get('OVERLAP_SIZE', 200);
      const strategy = options.segmentationStrategy || 'paragraph';

      this.logger.info('开始文本分段', {
        documentId: document.id,
        textLength: text.length,
        chunkSize,
        strategy,
      });

      const segments = await this.textSegmentationService.segmentText(
        text,
        { chunkSize, overlapSize, strategy },
      );

      // 保存分段到数据库
      const textSegments: TextSegment[] = [];
      for (let i = 0; i < segments.length; i++) {
        const segment = new TextSegment();
        segment.documentId = document.id;
        segment.segmentIndex = i;
        segment.content = segments[i].content;
        segment.startPage = segments[i].startPage || 1;
        segment.endPage = segments[i].endPage || document.totalPages;
        segment.characterCount = segments[i].content.length;
        segment.wordCount = this.estimateTokenCount(segments[i].content); // Using as word count approximation
        segment.metadata = segments[i].metadata || {};
        segment.calculateStats(); // Calculate proper stats

        textSegments.push(segment);
      }

      await this.textSegmentRepository.save(textSegments);

      // 更新文档状态
      await this.updateDocumentStatus(document.id, 'completed', null, segments.length);

      this.logger.info('文本分段完成', {
        documentId: document.id,
        segmentCount: segments.length,
      });
    } catch (error) {
      this.logger.error('文本分段失败', {
        documentId: document.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取PDF文档信息
   */
  async getPdfDocument(id: string): Promise<PdfDocumentResponseDto> {
    const document = await this.pdfDocumentRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('PDF文档不存在');
    }

    return this.mapToResponseDto(document);
  }

  /**
   * 获取文档分段列表
   */
  async getSegments(
    documentId: string,
    page: number,
    limit: number,
  ): Promise<{
    segments: TextSegmentResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [segments, total] = await this.textSegmentRepository.findAndCount({
      where: { documentId },
      order: { segmentIndex: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      segments: segments.map(this.mapSegmentToResponseDto),
      total,
      page,
      limit,
    };
  }

  /**
   * 流式返回所有分段
   */
  async streamSegments(documentId: string, res: Response): Promise<void> {
    const segments = await this.textSegmentRepository.find({
      where: { documentId },
      order: { segmentIndex: 'ASC' },
    });

    res.write('{"segments":[');
    
    for (let i = 0; i < segments.length; i++) {
      if (i > 0) res.write(',');
      res.write(JSON.stringify(this.mapSegmentToResponseDto(segments[i])));
    }
    
    res.write(']}');
    res.end();
  }

  /**
   * 获取所有PDF文档列表
   */
  async getAllPdfDocuments(
    page: number,
    limit: number,
    status?: 'pending' | 'processing' | 'completed' | 'failed',
  ): Promise<{
    documents: PdfDocumentResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where = status ? { status } : {};
    
    const [documents, total] = await this.pdfDocumentRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      documents: documents.map(this.mapToResponseDto),
      total,
      page,
      limit,
    };
  }

  /**
   * 重新处理PDF文档
   */
  async reprocessPdf(id: string): Promise<PdfDocumentResponseDto> {
    const document = await this.pdfDocumentRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('PDF文档不存在');
    }

    // 删除现有分段
    await this.textSegmentRepository.delete({ documentId: id });

    // 重置状态
    document.status = 'processing';
    document.totalSegments = 0;
    document.errorMessage = null;
    await this.pdfDocumentRepository.save(document);

    // 重新解析和分段
    try {
      const pdfBuffer = fs.readFileSync(document.filePath);
      const pdfData = await pdfParse(pdfBuffer);
      
      this.processTextSegmentation(document, pdfData.text, {})
        .catch(error => {
          this.updateDocumentStatus(id, 'failed', error.message);
        });
    } catch (error) {
      await this.updateDocumentStatus(id, 'failed', error.message);
      throw new BadRequestException(`重新处理失败: ${error.message}`);
    }

    return this.mapToResponseDto(document);
  }

  /**
   * 更新文档状态
   */
  private async updateDocumentStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string,
    totalSegments?: number,
  ): Promise<void> {
    const updateData: Partial<PdfDocument> = { status };
    
    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }
    
    if (totalSegments !== undefined) {
      updateData.totalSegments = totalSegments;
    }

    await this.pdfDocumentRepository.update(id, updateData);
  }

  /**
   * 估算Token数量
   */
  private estimateTokenCount(text: string): number {
    // 简单估算：英文约4字符/token，中文约1.5字符/token
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  /**
   * 映射到响应DTO
   */
  private mapToResponseDto(document: PdfDocument): PdfDocumentResponseDto {
    return {
      id: document.id,
      filename: document.filename,
      originalName: document.originalName,
      status: document.status,
      totalPages: document.totalPages,
      totalSegments: document.totalSegments,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  /**
   * 映射分段到响应DTO
   */
  private mapSegmentToResponseDto(segment: TextSegment): TextSegmentResponseDto {
    return {
      id: segment.id,
      segmentIndex: segment.segmentIndex,
      content: segment.content,
      startPage: segment.startPage,
      endPage: segment.endPage,
      characterCount: segment.characterCount,
      wordCount: segment.wordCount,
      syncedToDify: segment.syncedToDify,
    };
  }
}
