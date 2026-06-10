import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 Application running on: http://localhost:${port}`);
  logger.log(`📋 Health check: http://localhost:${port}/health`);
}
bootstrap();

