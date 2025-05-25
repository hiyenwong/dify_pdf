import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class SyncToDifyDto {
  @ApiProperty({
    description: 'PDF文档ID',
    example: 'uuid-string',
  })
  @IsString()
  documentId: string;

  @ApiProperty({
    description: 'Dify知识库ID',
    required: false,
    example: 'kb-uuid',
  })
  @IsOptional()
  @IsString()
  knowledgeBaseId?: string;

  @ApiProperty({
    description: '是否覆盖已存在的文档',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

export class DifyDocumentDto {
  @ApiProperty({ description: 'Dify文档ID' })
  id: string;

  @ApiProperty({ description: '文档名称' })
  name: string;

  @ApiProperty({ description: '文档类型' })
  type: string;

  @ApiProperty({ description: '字符数' })
  character_count: number;

  @ApiProperty({ description: '创建时间' })
  created_at: string;

  @ApiProperty({ description: '更新时间' })
  updated_at: string;
}

export class KnowledgeBaseQueryDto {
  @ApiProperty({
    description: '查询文本',
    example: '这是一个查询问题',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: '返回结果数量',
    required: false,
    default: 5,
  })
  @IsOptional()
  limit?: number;

  @ApiProperty({
    description: '相似度阈值',
    required: false,
    default: 0.7,
  })
  @IsOptional()
  similarity_threshold?: number;
}

export class DifyKnowledgeBaseResponseDto {
  @ApiProperty({ description: '知识库ID' })
  id: string;

  @ApiProperty({ description: '知识库名称' })
  name: string;

  @ApiProperty({ description: '描述' })
  description: string;

  @ApiProperty({ description: '文档数量' })
  document_count: number;

  @ApiProperty({ description: '创建时间' })
  created_at: string;
}
