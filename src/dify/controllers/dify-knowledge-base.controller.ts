import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { DifyKnowledgeBaseService } from '../services/dify-knowledge-base.service';
import { 
  KnowledgeBaseQueryDto,
  DifyKnowledgeBaseResponseDto 
} from '../dto/dify.dto';

@ApiTags('dify-knowledge-base')
@Controller('dify/knowledge-base')
export class DifyKnowledgeBaseController {
  constructor(private readonly difyKnowledgeBaseService: DifyKnowledgeBaseService) {}

  @Get('external-data/:documentId')
  @ApiOperation({ 
    summary: '作为Dify知识库外部数据源的接口',
    description: '供Dify知识库调用，获取指定PDF文档的分段数据',
  })
  @ApiParam({ name: 'documentId', description: 'PDF文档ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiHeader({ name: 'X-Dify-Source', required: false, description: 'Dify来源标识' })
  @ApiResponse({
    status: 200,
    description: '成功返回文档分段数据',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              content: { type: 'string' },
              metadata: { type: 'object' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            hasNext: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getExternalData(
    @Param('documentId') documentId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Headers('X-Dify-Source') difySource?: string,
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
    return this.difyKnowledgeBaseService.getExternalData(
      documentId,
      page,
      limit,
      difySource,
    );
  }

  @Post('query')
  @ApiOperation({ 
    summary: '查询知识库',
    description: '在已同步的PDF内容中进行语义搜索',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              score: { type: 'number' },
              documentId: { type: 'string' },
              segmentIndex: { type: 'number' },
              metadata: { type: 'object' },
            },
          },
        },
        query: { type: 'string' },
        totalResults: { type: 'number' },
      },
    },
  })
  async queryKnowledgeBase(@Body() dto: KnowledgeBaseQueryDto): Promise<{
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
    return this.difyKnowledgeBaseService.searchKnowledgeBase(dto);
  }

  @Get('documents')
  @ApiOperation({ summary: '获取所有已同步到Dify的文档列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiResponse({
    status: 200,
    description: '成功获取文档列表',
    type: [DifyKnowledgeBaseResponseDto],
  })
  async getSyncedDocuments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{
    documents: DifyKnowledgeBaseResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.difyKnowledgeBaseService.getSyncedDocuments(page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取知识库统计信息' })
  @ApiResponse({
    status: 200,
    description: '成功获取统计信息',
    schema: {
      type: 'object',
      properties: {
        totalDocuments: { type: 'number' },
        totalSegments: { type: 'number' },
        syncedDocuments: { type: 'number' },
        avgSegmentsPerDocument: { type: 'number' },
        lastSyncTime: { type: 'string' },
      },
    },
  })
  async getKnowledgeBaseStats(): Promise<{
    totalDocuments: number;
    totalSegments: number;
    syncedDocuments: number;
    avgSegmentsPerDocument: number;
    lastSyncTime: string;
  }> {
    return this.difyKnowledgeBaseService.getKnowledgeBaseStats();
  }

  @Post('webhook')
  @ApiOperation({ 
    summary: 'Dify Webhook接口',
    description: '接收来自Dify的回调通知',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook处理成功',
  })
  async handleWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ): Promise<{
    status: string;
    message: string;
    timestamp: string;
  }> {
    return this.difyKnowledgeBaseService.handleDifyWebhook(payload, headers);
  }
}
