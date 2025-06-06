import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers['authorization'];

    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        {
          error_code: 1001,
          error_msg: '无效的 Authorization 头格式。预期格式为 Bearer <api-key>'
        },
        HttpStatus.FORBIDDEN
      );
    }

    const apiKey = authorization.replace('Bearer ', '');
    const validApiKey = this.configService.get<string>('DIFY_API_KEY') || 'test-api-key-123';

    if (!apiKey || apiKey !== validApiKey) {
      throw new HttpException(
        {
          error_code: 1002,
          error_msg: '授权失败'
        },
        HttpStatus.FORBIDDEN
      );
    }

    return true;
  }
}
