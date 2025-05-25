import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  Body,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { PdfProcessingService } from '../services/pdf-processing.service';
import {
  ProcessPdfDto,
  PdfDocumentResponseDto,
  TextSegmentResponseDto
} from '../dto/pdf.dto';

@ApiTags('pdf')
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfProcessingService: PdfProcessingService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传并处理PDF文件' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: '成功上传并开始处理PDF',
    type: PdfDocumentResponseDto,
  })
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: Omit<ProcessPdfDto, 'file'>,
  ): Promise<PdfDocumentResponseDto> {
    return this.pdfProcessingService.processPdf(file, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取PDF文档信息' })
  @ApiParam({ name: 'id', description: 'PDF文档ID' })
  @ApiResponse({
    status: 200,
    description: '成功获取PDF文档信息',
    type: PdfDocumentResponseDto,
  })
  async getPdfDocument(@Param('id') id: string): Promise<PdfDocumentResponseDto> {
    return this.pdfProcessingService.getPdfDocument(id);
  }

  @Get(':id/segments')
  @ApiOperation({ summary: '获取PDF文档的分段列表' })
  @ApiParam({ name: 'id', description: 'PDF文档ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiResponse({
    status: 200,
    description: '成功获取分段列表',
    type: [TextSegmentResponseDto],
  })
  async getSegments(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{
    segments: TextSegmentResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.pdfProcessingService.getSegments(id, page, limit);
  }

  @Get(':id/segments/stream')
  @ApiOperation({ summary: '流式获取PDF文档的所有分段' })
  @ApiParam({ name: 'id', description: 'PDF文档ID' })
  @ApiResponse({
    status: 200,
    description: '流式输出所有分段',
  })
  async streamSegments(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    await this.pdfProcessingService.streamSegments(id, res);
  }

  @Get()
  @ApiOperation({ summary: '获取所有PDF文档列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'status', required: false, description: '过滤状态' })
  @ApiResponse({
    status: 200,
    description: '成功获取PDF文档列表',
    type: [PdfDocumentResponseDto],
  })
  async getAllPdfDocuments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: 'pending' | 'processing' | 'completed' | 'failed',
  ): Promise<{
    documents: PdfDocumentResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.pdfProcessingService.getAllPdfDocuments(page, limit, status);
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: '重新处理PDF文档' })
  @ApiParam({ name: 'id', description: 'PDF文档ID' })
  @ApiResponse({
    status: 200,
    description: '成功重新处理PDF文档',
    type: PdfDocumentResponseDto,
  })
  async reprocessPdf(@Param('id') id: string): Promise<PdfDocumentResponseDto> {
    return this.pdfProcessingService.reprocessPdf(id);
  }
}