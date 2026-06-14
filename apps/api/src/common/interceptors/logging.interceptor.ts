import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLogger } from '../logger/logger.service.js';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    const method = req.method;
    const path = req.originalUrl || req.url;
    const userId = req.user?.sub || req.user?.id;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = res.statusCode;
          const latencyMs = Date.now() - now;

          this.logger.httpRequest({
            method,
            path,
            userId,
            statusCode,
            latencyMs,
          });
        },
        error: (error: any) => {
          const statusCode = error.status || 500;
          const latencyMs = Date.now() - now;
          this.logger.httpRequest({
            method,
            path,
            userId,
            statusCode,
            latencyMs,
          });
        }
      }),
    );
  }
}
