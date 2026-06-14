import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Global Validation Pipe ────────────────────────────────────────────────
  // Validates all incoming DTOs via class-validator; strips unknown properties
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global Exception Filter ───────────────────────────────────────────────
  // Converts all thrown exceptions into a consistent JSON error envelope
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Global Logging Interceptor ────────────────────────────────────────────
  // Logs every request with method, path, status, and response time
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 Application running on: http://localhost:${port}`);
  logger.log(`📋 Health check: http://localhost:${port}/health`);
  logger.log(`📊 Reports API: http://localhost:${port}/reports`);
}
bootstrap();


