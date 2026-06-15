import React, { useEffect, useState } from 'react';
import { useAuditProgress } from '../lib/sse';
import { CheckCircle2, Circle, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

interface AuditProgressProps {
  auditId: string;
  onComplete: (blobId: string, walrusUrl: string) => void;
}

export function AuditProgress({ auditId, onComplete }: AuditProgressProps) {
  const { status, pct, message, blobId, walrusUrl, error } = useAuditProgress(auditId);
  const [completedCallbackFired, setCompletedCallbackFired] = useState(false);

  useEffect(() => {
    if (status === 'complete' && blobId && walrusUrl && !completedCallbackFired) {
      const timer = setTimeout(() => {
        onComplete(blobId, walrusUrl);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, blobId, walrusUrl, onComplete, completedCallbackFired]);

  const handleManualComplete = () => {
    if (blobId && walrusUrl) {
      setCompletedCallbackFired(true);
      onComplete(blobId, walrusUrl);
    }
  };

  const steps = [
    { key: 'submitted', label: 'Submitted', threshold: 0 },
    { key: 'connecting', label: 'Connecting to audit stream', threshold: 5 },
    { key: 'parsing', label: 'Parsing contract structure', threshold: 10 },
    { key: 'analyzing', label: 'Running AI security analysis', threshold: 20 },
    { key: 'storing', label: 'Generating report & uploading to Walrus', threshold: 75 },
    { key: 'complete', label: 'Complete', threshold: 100 },
  ];

  const getStepStatus = (threshold: number, nextThreshold: number) => {
    if (status === 'error') return 'error';
    if (pct >= nextThreshold || status === 'complete') return 'done';
    if (pct >= threshold && pct < nextThreshold) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full max-w-xl mx-auto p-5 rounded-xl surface shadow-lg">
      {/* Progress header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-medium text-white">Audit in Progress</h2>
          <span className="text-xs font-mono text-zinc-500">{pct}%</span>
        </div>
        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              status === 'complete' ? 'bg-emerald-500' : status === 'error' ? 'bg-red-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {message && status !== 'error' && status !== 'complete' && (
          <p className="mt-2 text-xs text-indigo-400">{message}</p>
        )}
        {status === 'error' && (
          <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {error || 'An unexpected error occurred'}
          </p>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const nextThreshold = steps[index + 1]?.threshold ?? 101;
          const stepStatus = getStepStatus(step.threshold, nextThreshold);
          const isDone = stepStatus === 'done' || step.key === 'submitted';
          const isActive = stepStatus === 'active';

          if ((step.key === 'connecting' || step.key === 'complete') && !isActive && !isDone) return null;

          return (
            <div key={step.key} className={`flex items-start gap-3 ${!isDone && !isActive ? 'opacity-40' : ''}`}>
              <div className="mt-0.5">
                {isDone ? (
                  <CheckCircle2 className="text-emerald-500 w-4 h-4" />
                ) : isActive ? (
                  <Loader2 className="text-indigo-400 w-4 h-4 animate-spin" />
                ) : (
                  <Circle className="text-zinc-700 w-4 h-4" />
                )}
              </div>
              <p className={`text-xs font-medium ${isDone ? 'text-zinc-400' : isActive ? 'text-indigo-400' : 'text-zinc-600'}`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Complete state */}
      {status === 'complete' && (
        <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Audit complete!
          </div>
          <button
            onClick={handleManualComplete}
            className="btn-primary text-xs py-2 px-3"
          >
            View Report <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
