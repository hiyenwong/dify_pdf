import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { PdfController } from './controllers/pdf.controller';
import { PdfProcessingService } from './services/pdf-processing.service';
import { TextSegmentationService } from './services/text-segmentation.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    DatabaseModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: diskStorage({
          destination: configService.get('PDF_UPLOAD_DIR', './uploads'),
          filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            callback(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
          },
        }),
        fileFilter: (req, file, callback) => {
          if (file.mimetype === 'application/pdf') {
            callback(null, true);
          } else {
            callback(new Error('只支持PDF文件'), false);
          }
        },
        limits: {
          fileSize: 50 * 1024 * 1024, // 50MB
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PdfController],
  providers: [PdfProcessingService, TextSegmentationService],
  exports: [PdfProcessingService, TextSegmentationService],
})
export class PdfModule {}
