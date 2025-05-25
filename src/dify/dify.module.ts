import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { DifyController } from './controllers/dify.controller';
import { DifyKnowledgeBaseController } from './controllers/dify-knowledge-base.controller';
import { DifyIntegrationService } from './services/dify-integration.service';
import { DifyKnowledgeBaseService } from './services/dify-knowledge-base.service';

@Module({
  imports: [
    DatabaseModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [DifyController, DifyKnowledgeBaseController],
  providers: [DifyIntegrationService, DifyKnowledgeBaseService],
  exports: [DifyIntegrationService, DifyKnowledgeBaseService],
})
export class DifyModule {}
