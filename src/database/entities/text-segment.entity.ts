import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { PdfDocument } from './pdf-document.entity';

export enum SegmentationType {
  FIXED_SIZE = 'fixed_size',
  PARAGRAPH = 'paragraph',
  SEMANTIC = 'semantic',
}

@Entity('text_segments')
@Index(['documentId', 'segmentIndex'])
@Index(['segmentationType'])
export class TextSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id' })
  documentId: string;

  @ManyToOne(() => PdfDocument, document => document.segments, {
    onDelete: 'CASCADE',
  })
  document: PdfDocument;

  @Column({ name: 'segment_index', type: 'integer' })
  segmentIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'start_page', type: 'integer', nullable: true })
  startPage?: number;

  @Column({ name: 'end_page', type: 'integer', nullable: true })
  endPage?: number;

  @Column({ name: 'start_position', type: 'integer', nullable: true })
  startPosition?: number;

  @Column({ name: 'end_position', type: 'integer', nullable: true })
  endPosition?: number;

  @Column({
    name: 'segmentation_type',
    type: 'varchar',
    enum: SegmentationType,
    default: SegmentationType.FIXED_SIZE,
  })
  segmentationType: SegmentationType;

  @Column({ name: 'word_count', type: 'integer' })
  wordCount: number;

  @Column({ name: 'character_count', type: 'integer' })
  characterCount: number;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'embedding_vector', type: 'text', nullable: true })
  embeddingVector?: string;

  @Column({ name: 'semantic_score', type: 'real', nullable: true })
  semanticScore?: number;

  @Column({ name: 'dify_document_id', type: 'varchar', nullable: true })
  difyDocumentId?: string;

  @Column({ name: 'dify_segment_id', type: 'varchar', nullable: true })
  difySegmentId?: string;

  @Column({ name: 'synced_to_dify', type: 'boolean', default: false })
  syncedToDify: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  getSummary(): string {
    const preview = this.content.length > 100 
      ? this.content.substring(0, 100) + '...' 
      : this.content;
    return `Segment ${this.segmentIndex}: ${preview}`;
  }

  isValidSegment(): boolean {
    return this.content && this.content.trim().length > 0 && this.wordCount > 0;
  }

  getMetadataValue(key: string): any {
    return this.metadata ? this.metadata[key] : undefined;
  }

  setMetadataValue(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }

  // Calculate text statistics
  calculateStats(): void {
    const trimmedContent = this.content.trim();
    this.characterCount = trimmedContent.length;
    this.wordCount = trimmedContent.split(/\s+/).filter(word => word.length > 0).length;
  }

  // Export for Dify integration
  toDifyFormat(): {
    text: string;
    metadata: Record<string, any>;
  } {
    return {
      text: this.content,
      metadata: {
        segment_index: this.segmentIndex,
        segmentation_type: this.segmentationType,
        word_count: this.wordCount,
        character_count: this.characterCount,
        start_page: this.startPage,
        end_page: this.endPage,
        semantic_score: this.semanticScore,
        ...this.metadata,
      },
    };
  }
}
