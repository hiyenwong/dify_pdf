import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DifyIntegrationService } from '../services/dify-integration.service';
import { DifyOpenSearchIntegrationService } from '../services/dify-opensearch-integration.service';
import { OpenSearchService } from '../../opensearch/opensearch.service';
import { 
  SyncToDifyDto, 
  DifyDocumentDto 
} from '../dto/dify.dto';
import { 
  KnowledgeBaseQueryDto, 
  KnowledgeBaseQueryResultDto,
  SyncToOpenSearchDto,
  OpenSearchSyncStatusDto,
  OpenSearchHealthDto
} from '../dto/knowledge-base.dto';

@ApiTags('dify')
@Controller('dify')
export class DifyController {
  constructor(
    private readonly difyIntegrationService: DifyIntegrationService,
    private readonly difyOpenSearchIntegrationService: DifyOpenSearchIntegrationService,
    private readonly openSearchService: OpenSearchService,
  ) {}

  @Post('sync')
  @ApiOperation({ summary: '将PDF分段同步到Dify知识库' })
  @ApiResponse({
    status: 201,
    description: '同步成功',
    type: DifyDocumentDto,
  })
  @ApiResponse({ status: 400, description: '同步失败' })
  async syncToDify(@Body() dto: SyncToDifyDto): Promise<{
    success: boolean;
    difyDocuments: DifyDocumentDto[];
    message: string;
  }> {
    return this.difyIntegrationService.syncDocumentToDify(dto);
  }

  @Get('documents/:id/status')
  @ApiOperation({ summary: '获取Dify文档同步状态' })
  @ApiParam({ name: 'id', description: 'PDF文档ID' })
  @ApiResponse({
    status: 200,
    description: '成功获取同步状态',
  })
  async getSyncStatus(@Param('id') id: string): Promise<{
    documentId: string;
    syncedSegments: number;
    totalSegments: number;
    lastSyncAt: Date;
    status: string;
  }> {
    return this.difyIntegrationService.getSyncStatus(id);
  }

  @Post('documents/:id/resync')
  @ApiOperation({ summary: '重新同步PDF文档到Dify' })
  @ApiParam({ name: 'id', description: 'PDF文档ID' })
  @ApiResponse({
    status: 200,
    description: '重新同步成功',
  })
  async resyncDocument(@Param('id') id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.difyIntegrationService.resyncDocument(id);
  }

  @Get('webhook/test')
  @ApiOperation({ summary: '测试Dify Webhook连接' })
  @ApiResponse({
    status: 200,
    description: 'Webhook连接正常',
  })
  async testWebhook(): Promise<{
    status: string;
    timestamp: string;
  }> {
    return this.difyIntegrationService.testConnection();
  }

  // OpenSearch相关接口
  @Post('opensearch/sync')
  @ApiOperation({ summary: '将PDF文档同步到OpenSearch' })
  @ApiResponse({
    status: 201,
    description: '同步成功',
  })
  @ApiResponse({ status: 400, description: '同步失败' })
  async syncToOpenSearch(@Body() dto: SyncToOpenSearchDto): Promise<{
    success: boolean;
    syncedSegments: number;
    message: string;
  }> {
    return this.difyOpenSearchIntegrationService.syncPdfToOpenSearch(
      dto.pdfDocumentId,
      dto.force,
    );
  }

  @Get('opensearch/documents/:id/status')
  @ApiOperation({ summary: '获取OpenSearch同步状态' })
  @ApiParam({ name: 'id', description: 'PDF文档ID' })
  @ApiResponse({
    status: 200,
    description: '成功获取同步状态',
    type: OpenSearchSyncStatusDto,
  })
  async getOpenSearchSyncStatus(@Param('id') id: string): Promise<OpenSearchSyncStatusDto> {
    return this.difyOpenSearchIntegrationService.getSyncStatusFromOpenSearch(id);
  }

  @Delete('opensearch/documents/:id')
  @ApiOperation({ summary: '从OpenSearch删除PDF文档' })
  @ApiParam({ name: 'id', description: 'PDF文档ID' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
  })
  async deleteFromOpenSearch(@Param('id') id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.difyOpenSearchIntegrationService.deleteFromOpenSearch(id);
  }

  @Post('knowledge-base/query')
  @ApiOperation({ summary: '查询知识库（使用OpenSearch）' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: KnowledgeBaseQueryResultDto,
  })
  async queryKnowledgeBase(@Body() queryDto: KnowledgeBaseQueryDto): Promise<KnowledgeBaseQueryResultDto> {
    return this.difyOpenSearchIntegrationService.queryKnowledgeBase(queryDto);
  }

  @Get('knowledge-base/search')
  @ApiOperation({ summary: '搜索知识库（GET方式）' })
  @ApiQuery({ name: 'q', description: '查询文本' })
  @ApiQuery({ name: 'size', description: '返回结果数量', required: false })
  @ApiQuery({ name: 'from', description: '跳过结果数量', required: false })
  @ApiResponse({
    status: 200,
    description: '搜索成功',
    type: KnowledgeBaseQueryResultDto,
  })
  async searchKnowledgeBase(
    @Query('q') query: string,
    @Query('size') size?: number,
    @Query('from') from?: number,
  ): Promise<KnowledgeBaseQueryResultDto> {
    const queryDto: KnowledgeBaseQueryDto = {
      query,
      size: size ? parseInt(size.toString()) : 10,
      from: from ? parseInt(from.toString()) : 0,
    };
    
    return this.difyOpenSearchIntegrationService.queryKnowledgeBase(queryDto);
  }

  @Get('opensearch/health')
  @ApiOperation({ summary: '检查OpenSearch健康状态' })
  @ApiResponse({
    status: 200,
    description: 'OpenSearch状态正常',
    type: OpenSearchHealthDto,
  })
  async checkOpenSearchHealth(): Promise<OpenSearchHealthDto> {
    return this.openSearchService.healthCheck();
  }

  @Post('opensearch/bulk-sync')
  @ApiOperation({ summary: '批量同步所有PDF文档到OpenSearch' })
  @ApiResponse({
    status: 200,
    description: '批量同步完成',
  })
  async bulkSyncToOpenSearch(): Promise<{
    success: boolean;
    totalPdfs: number;
    syncedPdfs: number;
    failedPdfs: string[];
    message: string;
  }> {
    return this.difyOpenSearchIntegrationService.bulkSyncAllPdfsToOpenSearch();
  }
}
