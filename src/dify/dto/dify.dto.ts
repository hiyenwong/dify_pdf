import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

// Dify外部知识库API规范的DTO

export class RetrievalSettingDto {
  @ApiProperty({
    description: '检索结果的最大数量',
    example: 5,
  })
  @IsNumber()
  top_k: number;

  @ApiProperty({
    description: '结果与查询相关性的分数限制，范围：0~1',
    example: 0.5,
  })
  @IsNumber()
  score_threshold: number;
}

export class MetadataConditionDto {
  @ApiProperty({
    description: '需要筛选的 metadata 名称',
    example: ['category', 'tag'],
  })
  @IsArray()
  @IsString({ each: true })
  name: string[];

  @ApiProperty({
    description: '比较操作符',
    example: 'contains',
    enum: ['contains', 'not contains', 'start with', 'end with', 'is', 'is not', 'empty', 'not empty', '=', '≠', '>', '<', '≥', '≤', 'before', 'after'],
  })
  @IsString()
  comparison_operator: string;

  @ApiProperty({
    description: '对比值，当操作符为 empty、not empty、null、not null 时可省略',
    example: 'AI',
    required: false,
  })
  @IsOptional()
  @IsString()
  value?: string;
}

export class MetadataFilterDto {
  @ApiProperty({
    description: '逻辑操作符，取值为 and 或 or，默认 and',
    example: 'and',
    required: false,
  })
  @IsOptional()
  @IsString()
  logical_operator?: string;

  @ApiProperty({
    description: '条件列表',
    type: [MetadataConditionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetadataConditionDto)
  conditions: MetadataConditionDto[];
}

export class DifyRetrievalRequestDto {
  @ApiProperty({
    description: '知识库唯一 ID',
    example: 'AAA-BBB-CCC',
  })
  @IsString()
  knowledge_id: string;

  @ApiProperty({
    description: '用户的查询',
    example: 'Dify 是什么？',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: '知识检索参数',
    type: RetrievalSettingDto,
  })
  @ValidateNested()
  @Type(() => RetrievalSettingDto)
  retrieval_setting: RetrievalSettingDto;

  @ApiProperty({
    description: '原数组筛选',
    type: MetadataFilterDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MetadataFilterDto)
  metadata_condition?: MetadataFilterDto;
}

export class DifyRetrievalRecordDto {
  @ApiProperty({
    description: '包含知识库中数据源的文本块',
    example: 'Dify：GenAI 应用程序的创新引擎',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: '结果与查询的相关性分数，范围：0~1',
    example: 0.5,
  })
  @IsNumber()
  score: number;

  @ApiProperty({
    description: '文档标题',
    example: 'Dify 简介',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: '包含数据源中文档的元数据属性及其值',
    example: {
      path: 's3://dify/knowledge.txt',
      description: 'dify 知识文档'
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class DifyRetrievalResponseDto {
  @ApiProperty({
    description: '从知识库查询的记录列表',
    type: [DifyRetrievalRecordDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DifyRetrievalRecordDto)
  records: DifyRetrievalRecordDto[];
}

export class DifyErrorResponseDto {
  @ApiProperty({
    description: '错误代码',
    example: 1001,
  })
  @IsNumber()
  error_code: number;

  @ApiProperty({
    description: 'API 异常描述',
    example: '无效的 Authorization 头格式。预期格式为 Bearer <api-key>',
  })
  @IsString()
  error_msg: string;
}
