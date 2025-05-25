import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class ProcessPdfDto {
  @ApiProperty({
    description: 'PDF文件',
    type: 'string',
    format: 'binary',
    required: true,
  })
  file: Express.Multer.File;

  @ApiProperty({
    description: '分段大小（字符数）',
    example: 1000,
    required: false,
    minimum: 100,
    maximum: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(5000)
  @Transform(({ value }) => parseInt(value))
  chunkSize?: number;

  @ApiProperty({
    description: '重叠大小（字符数）',
    example: 200,
    required: false,
    minimum: 0,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  @Transform(({ value }) => parseInt(value))
  overlapSize?: number;

  @ApiProperty({
    description: '分段策略',
    enum: ['fixed', 'paragraph', 'semantic'],
    example: 'paragraph',
    required: false,
  })
  @IsOptional()
  @IsString()
  segmentationStrategy?: 'fixed' | 'paragraph' | 'semantic';
}

export class PdfDocumentResponseDto {
  @ApiProperty({ description: 'PDF文档ID' })
  id: string;

  @ApiProperty({ description: '文件名' })
  filename: string;

  @ApiProperty({ description: '原始文件名' })
  originalName: string;

  @ApiProperty({ description: '处理状态' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @ApiProperty({ description: '总页数' })
  totalPages: number;

  @ApiProperty({ description: '总分段数' })
  totalSegments: number;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class TextSegmentResponseDto {
  @ApiProperty({ description: '分段ID' })
  id: string;

  @ApiProperty({ description: '分段索引' })
  segmentIndex: number;

  @ApiProperty({ description: '文本内容' })
  content: string;

  @ApiProperty({ description: '起始页' })
  startPage: number;

  @ApiProperty({ description: '结束页' })
  endPage: number;

  @ApiProperty({ description: '字符数' })
  characterCount: number;

  @ApiProperty({ description: '词汇数' })
  wordCount: number;

  @ApiProperty({ description: '是否已同步到Dify' })
  syncedToDify: boolean;
}
