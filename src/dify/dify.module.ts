import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { OpenSearchModule } from '../opensearch/opensearch.module';
import { DifyController } from './controllers/dify.controller';
import { DifyKnowledgeBaseController } from './controllers/dify-knowledge-base.controller';
import { DifyIntegrationService } from './services/dify-integration.service';
import { DifyKnowledgeBaseService } from './services/dify-knowledge-base.service';
import { DifyOpenSearchIntegrationService } from './services/dify-opensearch-integration.service';
import { PdfDocument } from '../database/entities/pdf-document.entity';
import { TextSegment } from '../database/entities/text-segment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PdfDocument, TextSegment]),
    DatabaseModule,
    OpenSearchModule,
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [DifyController, DifyKnowledgeBaseController],
  providers: [
    DifyIntegrationService, 
    DifyKnowledgeBaseService, 
    DifyOpenSearchIntegrationService
  ],
  exports: [
    DifyIntegrationService, 
    DifyKnowledgeBaseService, 
    DifyOpenSearchIntegrationService
  ],
})
export class DifyModule {}
