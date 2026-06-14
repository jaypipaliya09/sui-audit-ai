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

        if (data.files) {
          setFiles(data.files);
        }
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

        setTimeout(() => {
          router.push(`/repo-report/${data.blobId}`);
        }, 2000);
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
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-white mb-2">Repository Audit</h1>
          <p className="text-gray-500 text-sm">{message}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Overall Progress</span>
            <span className="text-white font-medium">{Math.round(overallPct)}%</span>
          </div>
          <div className="w-full h-3 bg-[#1a1a1a] rounded-full overflow-hidden border border-[#2a2a2a]">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

        {/* File Progress List */}
        {files.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden mb-8">
            {files.map((file, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i !== files.length - 1 ? 'border-b border-[#2a2a2a]' : ''}`}>
                <FileCode2 className="w-4 h-4 text-gray-600 shrink-0" />
                <span className="flex-1 text-sm text-white truncate">{file.name || file.path}</span>
                {file.status === 'queued' && (
                  <span className="text-xs text-gray-600 font-medium">Queued</span>
                )}
                {file.status === 'auditing' && (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                )}
                {file.status === 'done' && (
                  <div className="flex items-center gap-2">
                    <RiskBadge level={file.risk || 'CLEAN'} />
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </div>
                )}
                {file.status === 'failed' && (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Complete State */}
        {status === 'complete' && blobId && (
          <div className="text-center bg-green-500/5 border border-green-500/20 rounded-2xl p-8">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Audit Complete!</h2>
            <p className="text-gray-400 text-sm mb-4">Redirecting to your report...</p>
            <button
              onClick={() => router.push(`/repo-report/${blobId}`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all"
            >
              View Report <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center bg-red-500/5 border border-red-500/20 rounded-2xl p-8">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Audit Failed</h2>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
