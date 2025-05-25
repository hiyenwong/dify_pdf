import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { DifyIntegrationService } from '../services/dify-integration.service';
import { 
  SyncToDifyDto, 
  DifyDocumentDto 
} from '../dto/dify.dto';

@ApiTags('dify')
@Controller('dify')
export class DifyController {
  constructor(private readonly difyIntegrationService: DifyIntegrationService) {}

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
}
