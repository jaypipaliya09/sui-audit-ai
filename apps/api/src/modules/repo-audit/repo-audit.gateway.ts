import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

interface RepoAuditEvent {
  data: string;
  type?: string;
}

@Injectable()
export class RepoAuditGateway {
  private readonly logger = new Logger(RepoAuditGateway.name);
  private readonly streams = new Map<string, Subject<RepoAuditEvent>>();

  getEventStream(repoAuditId: string): Observable<RepoAuditEvent> {
    if (!this.streams.has(repoAuditId)) {
      this.streams.set(repoAuditId, new Subject<RepoAuditEvent>());
    }
    return this.streams.get(repoAuditId)!.asObservable();
  }

  emitProgress(repoAuditId: string, pct: number, message: string, extra?: Record<string, any>) {
    this.emit(repoAuditId, 'progress', { step: 'processing', message, pct, ...extra });
  }

  emitFileComplete(repoAuditId: string, fileName: string, risk: string, findingCount: number) {
    this.emit(repoAuditId, 'file_complete', { fileName, risk, findingCount });
  }

  emitComplete(repoAuditId: string, blobId: string, walrusUrl: string, onChainTxDigest?: string) {
    this.emit(repoAuditId, 'complete', { blobId, walrusUrl, onChainTxDigest });
    this.cleanup(repoAuditId);
  }

  emitError(repoAuditId: string, message: string) {
    this.emit(repoAuditId, 'error', { message });
    this.cleanup(repoAuditId);
  }

  private emit(repoAuditId: string, type: string, data: any) {
    const subject = this.streams.get(repoAuditId);
    if (subject) {
      subject.next({ data: JSON.stringify({ type, ...data }), type });
    }
  }

  private cleanup(repoAuditId: string) {
    const subject = this.streams.get(repoAuditId);
    if (subject) {
      subject.complete();
      this.streams.delete(repoAuditId);
    }
  }
}
