import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class AppLogger implements NestLoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    this.logger = pino({
      level: isProduction ? 'info' : 'debug',
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: { colorize: true },
          },
      formatters: {
        level: (label) => {
          return { level: label.toUpperCase() };
        },
      },
    });
  }

  // --- Standard NestJS Logger hooks ---
  log(message: any, ...optionalParams: any[]) {
    this.logger.info({ context: optionalParams[0] }, message);
  }

  error(message: any, ...optionalParams: any[]) {
    this.logger.error({ context: optionalParams[0] }, message);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn({ context: optionalParams[0] }, message);
  }

  debug?(message: any, ...optionalParams: any[]) {
    this.logger.debug({ context: optionalParams[0] }, message);
  }

  verbose?(message: any, ...optionalParams: any[]) {
    this.logger.trace({ context: optionalParams[0] }, message);
  }

  // --- Specific Structured Methods ---
  auditStarted(auditId: string, contractName: string, userId?: string) {
    this.logger.info({ event: 'auditStarted', auditId, contractName, userId }, 'Audit started');
  }

  claudeCall(auditId: string, latencyMs: number) {
    this.logger.info({ event: 'claudeCall', auditId, latencyMs }, 'Claude API call completed');
  }

  auditComplete(auditId: string, riskLevel: string) {
    this.logger.info({ event: 'auditComplete', auditId, riskLevel }, 'Audit completed successfully');
  }

  auditFailed(auditId: string, error: string) {
    this.logger.error({ event: 'auditFailed', auditId, error }, 'Audit failed');
  }

  repoAuditStarted(repoAuditId: string, repo: string, userId?: string) {
    this.logger.info({ event: 'repoAuditStarted', repoAuditId, repo, userId }, 'Repo audit started');
  }

  repoAuditComplete(repoAuditId: string, contractsAudited: number) {
    this.logger.info({ event: 'repoAuditComplete', repoAuditId, contractsAudited }, 'Repo audit completed');
  }

  httpRequest(data: { method: string; path: string; userId?: string; statusCode: number; latencyMs: number }) {
    this.logger.info({ event: 'httpRequest', ...data }, 'HTTP Request');
  }
}
