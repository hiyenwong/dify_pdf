import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

export interface SegmentationOptions {
  chunkSize: number;
  overlapSize: number;
  strategy: 'fixed' | 'paragraph' | 'semantic';
}

export interface TextSegmentData {
  content: string;
  startPage?: number;
  endPage?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class TextSegmentationService {
  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 将文本分割成有意义的段落
   */
  async segmentText(
    text: string,
    options: SegmentationOptions,
  ): Promise<TextSegmentData[]> {
    this.logger.info('开始文本分段', {
      textLength: text.length,
      strategy: options.strategy,
      chunkSize: options.chunkSize,
    });

    let segments: TextSegmentData[] = [];

    switch (options.strategy) {
      case 'paragraph':
        segments = this.segmentByParagraph(text, options);
        break;
      case 'semantic':
        segments = this.segmentBySemantic(text, options);
        break;
      case 'fixed':
      default:
        segments = this.segmentByFixedSize(text, options);
        break;
    }

    this.logger.info('文本分段完成', {
      segmentCount: segments.length,
      strategy: options.strategy,
    });

    return segments;
  }

  /**
   * 按固定大小分段
   */
  private segmentByFixedSize(
    text: string,
    options: SegmentationOptions,
  ): TextSegmentData[] {
    const segments: TextSegmentData[] = [];
    const { chunkSize, overlapSize } = options;

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);

      segments.push({
        content: chunk.trim(),
        metadata: {
          strategy: 'fixed',
          startIndex: start,
          endIndex: end,
        },
      });

      // 下一个分段的起始位置，考虑重叠
      start = end - overlapSize;
      if (start >= text.length) break;
    }

    return segments;
  }

  /**
   * 按段落分段
   */
  private segmentByParagraph(
    text: string,
    options: SegmentationOptions,
  ): TextSegmentData[] {
    const segments: TextSegmentData[] = [];
    const { chunkSize, overlapSize } = options;

    // 按双换行分割段落
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let paragraphIndex = 0;

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      // 如果当前段落加上新段落超过大小限制
      if (currentChunk.length + trimmedParagraph.length > chunkSize && currentChunk.length > 0) {
        segments.push({
          content: currentChunk.trim(),
          metadata: {
            strategy: 'paragraph',
            paragraphStart: paragraphIndex - currentChunk.split('\n\n').length + 1,
            paragraphEnd: paragraphIndex - 1,
          },
        });

        // 处理重叠
        if (overlapSize > 0) {
          const words = currentChunk.split(/\s+/);
          const overlapWords = words.slice(-Math.ceil(overlapSize / 5)); // 约5字符/词
          currentChunk = overlapWords.join(' ') + '\n\n' + trimmedParagraph;
        } else {
          currentChunk = trimmedParagraph;
        }
      } else {
        if (currentChunk.length > 0) {
          currentChunk += '\n\n' + trimmedParagraph;
        } else {
          currentChunk = trimmedParagraph;
        }
      }

      paragraphIndex++;
    }

    // 添加最后一个分段
    if (currentChunk.trim().length > 0) {
      segments.push({
        content: currentChunk.trim(),
        metadata: {
          strategy: 'paragraph',
          paragraphStart: paragraphIndex - currentChunk.split('\n\n').length + 1,
          paragraphEnd: paragraphIndex - 1,
        },
      });
    }

    return segments;
  }

  /**
   * 语义分段（简化版本）
   */
  private segmentBySemantic(
    text: string,
    options: SegmentationOptions,
  ): TextSegmentData[] {
    // 这里实现一个简化的语义分段算法
    // 实际项目中可以集成更复杂的NLP库或调用语义分析API
    
    const segments: TextSegmentData[] = [];
    const { chunkSize, overlapSize } = options;

    // 首先按句子分割
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let sentenceIndex = 0;
    let chunkStartIndex = 0;

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentChunk.length + trimmedSentence.length > chunkSize && currentChunk.length > 0) {
        // 寻找合适的断点
        const breakPoint = this.findSemanticBreakPoint(currentChunk);
        
        segments.push({
          content: currentChunk.trim(),
          metadata: {
            strategy: 'semantic',
            sentenceStart: chunkStartIndex,
            sentenceEnd: sentenceIndex - 1,
            breakPoint: breakPoint,
          },
        });

        // 处理重叠
        if (overlapSize > 0) {
          const words = currentChunk.split(/\s+/);
          const overlapWords = words.slice(-Math.ceil(overlapSize / 5));
          currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
        } else {
          currentChunk = trimmedSentence;
        }
        
        chunkStartIndex = sentenceIndex;
      } else {
        if (currentChunk.length > 0) {
          currentChunk += ' ' + trimmedSentence;
        } else {
          currentChunk = trimmedSentence;
        }
      }

      sentenceIndex++;
    }

    // 添加最后一个分段
    if (currentChunk.trim().length > 0) {
      segments.push({
        content: currentChunk.trim(),
        metadata: {
          strategy: 'semantic',
          sentenceStart: chunkStartIndex,
          sentenceEnd: sentenceIndex - 1,
        },
      });
    }

    return segments;
  }

  /**
   * 分割句子
   */
  private splitIntoSentences(text: string): string[] {
    // 简单的句子分割，支持中英文
    const sentences = text
      .split(/[。！？.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return sentences;
  }

  /**
   * 寻找语义断点
   */
  private findSemanticBreakPoint(text: string): string {
    // 简化的语义断点识别
    const semanticMarkers = [
      '因此', '所以', '总之', '综上所述', '另外', '此外', '然而', '但是',
      'therefore', 'however', 'moreover', 'furthermore', 'in conclusion',
    ];

    for (const marker of semanticMarkers) {
      if (text.toLowerCase().includes(marker)) {
        return marker;
      }
    }

    return 'paragraph_end';
  }

  /**
   * 验证分段质量
   */
  validateSegments(segments: TextSegmentData[]): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // 检查空分段
    const emptySegments = segments.filter(s => s.content.trim().length === 0);
    if (emptySegments.length > 0) {
      issues.push(`发现 ${emptySegments.length} 个空分段`);
    }

    // 检查过短分段
    const shortSegments = segments.filter(s => s.content.length < 50);
    if (shortSegments.length > 0) {
      issues.push(`发现 ${shortSegments.length} 个过短分段（<50字符）`);
    }

    // 检查过长分段
    const maxChunkSize = this.configService.get('DEFAULT_CHUNK_SIZE', 1000) * 2;
    const longSegments = segments.filter(s => s.content.length > maxChunkSize);
    if (longSegments.length > 0) {
      issues.push(`发现 ${longSegments.length} 个过长分段（>${maxChunkSize}字符）`);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
