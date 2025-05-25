import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TextSegment } from './text-segment.entity';

@Entity('pdf_documents')
export class PdfDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  filePath: string;

  @Column('int')
  fileSize: number;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  author?: string;

  @Column('int')
  totalPages: number;

  @Column('text', { nullable: true })
  metadata?: string;

  @Column({
    type: 'simple-enum',
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column('int', { default: 0 })
  totalSegments: number;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TextSegment, (segment) => segment.document)
  segments: TextSegment[];
}
