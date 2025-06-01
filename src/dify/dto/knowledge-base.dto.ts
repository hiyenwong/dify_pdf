import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, IsObject, IsBoolean } from 'class-validator';

export class KnowledgeBaseQueryDto {
  @ApiProperty({ description: '查询文本', example: '什么是机器学习？' })
  @IsString()
  query: string;

  @ApiProperty({ 
    description: '返回结果数量', 
    example: 10, 
    required: false, 
    minimum: 1, 
    maximum: 100 
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  size?: number = 10;

  @ApiProperty({ 
    description: '跳过结果数量（分页）', 
    example: 0, 
    required: false, 
    minimum: 0 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  from?: number = 0;

  @ApiProperty({ 
    description: '过滤条件', 
    example: { pdfDocumentId: 'doc-123' }, 
    required: false 
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class KnowledgeBaseQueryResultDto {
  @ApiProperty({ description: '总结果数' })
  total: number;

  @ApiProperty({ description: '查询结果' })
  results: Array<{
    id: string;
    score: number;
    title: string;
    content: string;
    metadata: Record<string, any>;
    highlights?: Record<string, string[]>;
  }>;

  @ApiProperty({ description: '查询耗时（毫秒）' })
  took: number;
}

export class SyncToOpenSearchDto {
  @ApiProperty({ description: 'PDF文档ID' })
  @IsString()
  pdfDocumentId: string;

  @ApiProperty({ description: '是否强制重新同步', required: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean = false;
}

export class OpenSearchSyncStatusDto {
  @ApiProperty({ description: 'PDF文档ID' })
  pdfDocumentId: string;

  @ApiProperty({ description: '已索引的分段数量' })
  indexedSegments: number;

  @ApiProperty({ description: '最后索引时间' })
  lastIndexedAt: Date | null;

  @ApiProperty({ description: '索引状态' })
  indexStatus: string;
}

export class OpenSearchHealthDto {
  @ApiProperty({ description: '连接状态' })
  status: string;

  @ApiProperty({ description: '集群信息' })
  cluster: any;
}
