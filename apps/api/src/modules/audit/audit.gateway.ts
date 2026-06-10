import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, merge } from 'rxjs';
import { map, takeUntil, filter } from 'rxjs/operators';

// ─── Step derivation ─────────────────────────────────────────────────────────

function deriveStep(pct: number): string {
  if (pct <= 15) return 'parsing';
  if (pct <= 70) return 'analyzing';
  if (pct <= 80) return 'scoring';
  if (pct <= 90) return 'storing';
  return 'finalizing';
}

// ─── Gateway ─────────────────────────────────────────────────────────────────

@Injectable()
export class AuditGateway {
  private readonly logger = new Logger(AuditGateway.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // ─── Emitters ──────────────────────────────────────────────────────────────

  emitProgress(auditId: string, pct: number, message: string): void {
    const step = deriveStep(pct);
    const payload = { pct, message, step };
    this.eventEmitter.emit(`audit:${auditId}:progress`, payload);
    this.logger.debug(`[${auditId}] progress ${pct}% — ${message}`);
  }

  emitComplete(auditId: string, blobId: string, walrusUrl: string): void {
    const payload = { blobId, walrusUrl, auditId };
    this.eventEmitter.emit(`audit:${auditId}:complete`, payload);
    this.logger.log(`[${auditId}] complete — blobId: ${blobId}`);
  }

  emitError(auditId: string, errorMessage: string): void {
    const payload = { errorMessage, auditId };
    this.eventEmitter.emit(`audit:${auditId}:error`, payload);
    this.logger.error(`[${auditId}] error — ${errorMessage}`);
  }

  // ─── SSE Stream ────────────────────────────────────────────────────────────

  /**
   * Returns an RxJS Observable that:
   * - Emits progress, complete, and error events for the given auditId
   * - Completes automatically on 'complete' or 'error'
   * - Formats each event as a MessageEvent for NestJS @Sse()
   */
  getEventStream(auditId: string): Observable<MessageEvent> {
    const progressEvent = `audit:${auditId}:progress`;
    const completeEvent = `audit:${auditId}:complete`;
    const errorEvent = `audit:${auditId}:error`;

    // Completion signal — fires on either complete or error
    const done$ = merge(
      fromEvent(this.eventEmitter as any, completeEvent),
      fromEvent(this.eventEmitter as any, errorEvent),
    );

    const progress$ = fromEvent(this.eventEmitter as any, progressEvent).pipe(
      takeUntil(done$),
      map(
        (payload) =>
          ({
            data: JSON.stringify({ type: 'progress', ...(payload as object) }),
            type: 'progress',
          }) as MessageEvent,
      ),
    );

    const complete$ = fromEvent(this.eventEmitter as any, completeEvent).pipe(
      map(
        (payload) =>
          ({
            data: JSON.stringify({ type: 'complete', ...(payload as object) }),
            type: 'complete',
          }) as MessageEvent,
      ),
    );

    const error$ = fromEvent(this.eventEmitter as any, errorEvent).pipe(
      map(
        (payload) =>
          ({
            data: JSON.stringify({ type: 'error', ...(payload as object) }),
            type: 'error',
          }) as MessageEvent,
      ),
    );

    return merge(progress$, complete$, error$);
  }
}
