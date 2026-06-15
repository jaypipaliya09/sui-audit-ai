'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RiskBadge } from '@/components/RiskBadge';
import { Loader2, CheckCircle2, XCircle, FileCode2, ArrowRight } from 'lucide-react';

type FileStatus = 'queued' | 'auditing' | 'done' | 'failed';

interface FileProgress {
  name: string;
  path: string;
  status: FileStatus;
  risk?: string;
}

export default function RepoAuditProgressPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [status, setStatus] = useState<'connecting' | 'processing' | 'complete' | 'error'>('connecting');
  const [files, setFiles] = useState<FileProgress[]>([]);
  const [overallPct, setOverallPct] = useState(0);
  const [message, setMessage] = useState('Connecting to audit stream...');
  const [blobId, setBlobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const eventSource = new EventSource(`${API_URL}/repo-audit/${id}/status`);

    eventSource.addEventListener('progress', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setStatus('processing');
        setOverallPct(data.pct || 0);
        setMessage(data.message || 'Processing...');
        if (data.files) setFiles(data.files);
      } catch {}
    });

    eventSource.addEventListener('file-complete', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setFiles((prev) =>
          prev.map((f) =>
            f.path === data.path ? { ...f, status: 'done', risk: data.risk } : f
          )
        );
      } catch {}
    });

    eventSource.addEventListener('complete', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setStatus('complete');
        setOverallPct(100);
        setMessage('Repo audit complete!');
        setBlobId(data.blobId);
        eventSource.close();
        setTimeout(() => router.push(`/repo-report/${data.blobId}`), 2000);
      } catch {}
    });

    eventSource.addEventListener('error', (e: MessageEvent) => {
      try {
        if (e.data) {
          const data = JSON.parse(e.data);
          setError(data.message || 'Audit failed');
        } else {
          setError('Connection lost');
        }
      } catch {
        setError('Audit failed');
      }
      setStatus('error');
      eventSource.close();
    });

    eventSource.onerror = () => {
      setStatus((prev) => {
        if (prev === 'complete' || prev === 'error') return prev;
        setError('Connection to audit stream failed.');
        return 'error';
      });
      eventSource.close();
    };

    return () => eventSource.close();
  }, [id, router]);

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/8 text-indigo-400 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Repository Audit
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Auditing Repository</h1>
          <p className="text-xs text-zinc-500">{message}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6 animate-fadeInUp">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-zinc-500">Progress</span>
            <span className="text-white font-medium">{Math.round(overallPct)}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="rounded-lg surface overflow-hidden mb-6 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            {files.map((file, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  i !== files.length - 1 ? 'border-b border-zinc-800/40' : ''
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <span className="flex-1 text-xs text-white truncate">{file.name || file.path}</span>
                {file.status === 'queued' && (
                  <span className="text-[10px] text-zinc-700 font-medium">Queued</span>
                )}
                {file.status === 'auditing' && (
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                )}
                {file.status === 'done' && (
                  <div className="flex items-center gap-1.5">
                    <RiskBadge level={file.risk || 'CLEAN'} />
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}
                {file.status === 'failed' && (
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Complete */}
        {status === 'complete' && blobId && (
          <div className="text-center bg-emerald-500/[0.04] border border-emerald-500/15 rounded-xl p-8 animate-scaleIn">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-white mb-1">Audit Complete!</h2>
            <p className="text-xs text-zinc-500 mb-4">Redirecting to your report...</p>
            <button
              onClick={() => router.push(`/repo-report/${blobId}`)}
              className="btn-primary text-xs py-2"
            >
              View Report <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="text-center bg-red-500/[0.04] border border-red-500/15 rounded-xl p-8">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-white mb-1">Audit Failed</h2>
            <p className="text-xs text-zinc-500">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
