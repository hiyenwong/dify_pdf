import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 获取配置服务
  const configService = app.get(ConfigService);
  
  // 使用Winston日志服务
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  
  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // CORS配置
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger API文档配置
  const config = new DocumentBuilder()
    .setTitle('PDF Dify Integration API')
    .setDescription('PDF内容分段与Dify集成工具 - 智能PDF处理和LLM集成API')
    .setVersion('1.0')
    .addTag('pdf', 'PDF处理相关接口')
    .addTag('dify', 'Dify集成相关接口')
    .addTag('segments', '文档分段管理接口')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'PDF Dify Integration API',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // 启动服务器
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  
  console.log(`🚀 应用程序运行在: http://localhost:${port}`);
  console.log(`📚 API文档地址: http://localhost:${port}/api`);
}

bootstrap();
