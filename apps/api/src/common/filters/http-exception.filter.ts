import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AppLogger } from '../logger/logger.service.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'object' && message !== null && 'message' in message 
        ? (message as any).message 
        : message,
      error: typeof message === 'object' && message !== null && 'error' in message
        ? (message as any).error
        : exception instanceof Error ? exception.name : 'UnknownError'
    };

    if (status >= 500) {
      this.logger.error(`Critical 5xx Error on ${request.method} ${request.url}: ${exception instanceof Error ? exception.stack : JSON.stringify(exception)}`);
      // Optionally trigger alert webhook here
    }

    response.status(status).json(errorResponse);
  }
}
