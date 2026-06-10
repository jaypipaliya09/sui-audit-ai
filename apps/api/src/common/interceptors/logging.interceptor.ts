import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Logs every incoming request and its response time.
 *
 * Output format:
 *   → [POST] /audit/submit
 *   ✓ [POST] /audit/submit 202 — 1234ms
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, url } = req;
    const start = Date.now();

    this.logger.log(`→ [${method}] ${url}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(`✓ [${method}] ${url} ${res.statusCode} — ${ms}ms`);
        },
        error: () => {
          const ms = Date.now() - start;
          this.logger.warn(`✗ [${method}] ${url} — ${ms}ms`);
        },
      }),
    );
  }
}
