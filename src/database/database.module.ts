import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PdfDocument } from './entities/pdf-document.entity';
import { TextSegment } from './entities/text-segment.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get('DATABASE_PATH', './data/pdf_segments.db'),
        entities: [PdfDocument, TextSegment],
        synchronize: true,
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([PdfDocument, TextSegment]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
