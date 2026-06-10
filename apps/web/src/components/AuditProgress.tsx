import React, { useEffect, useState } from 'react';
import { useAuditProgress } from '../lib/sse';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';

interface AuditProgressProps {
  auditId: string;
  onComplete: (blobId: string, walrusUrl: string) => void;
}

export function AuditProgress({ auditId, onComplete }: AuditProgressProps) {
  const { status, pct, message, blobId, walrusUrl, error } = useAuditProgress(auditId);
  const [completedCallbackFired, setCompletedCallbackFired] = useState(false);

  useEffect(() => {
    if (status === 'complete' && blobId && walrusUrl && !completedCallbackFired) {
      // Set timeout for auto-redirect after 3 seconds
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
    { key: 'storing', label: 'Generating report & Uploading to Walrus', threshold: 75 },
    { key: 'complete', label: 'Complete', threshold: 100 },
  ];

  const getStepStatus = (threshold: number, nextThreshold: number) => {
    if (status === 'error') return 'error';
    if (pct >= nextThreshold || status === 'complete') return 'done';
    if (pct >= threshold && pct < nextThreshold) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 rounded-xl border border-gray-800 bg-[#121212] shadow-xl text-gray-200">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold text-white">Audit in Progress</h2>
          <span className="text-sm font-mono text-gray-400">{pct}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              status === 'complete' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${pct}%` }}
          ></div>
        </div>
        {message && status !== 'error' && status !== 'complete' && (
          <p className="mt-3 text-sm text-blue-400 animate-pulse">{message}</p>
        )}
        {status === 'error' && (
          <p className="mt-3 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle size={16} />
            {error || 'An unexpected error occurred'}
          </p>
        )}
      </div>

      <div className="space-y-6">
        {steps.map((step, index) => {
          const nextThreshold = steps[index + 1]?.threshold ?? 101;
          const stepStatus = getStepStatus(step.threshold, nextThreshold);

          // Always show submitted as done
          const isDone = stepStatus === 'done' || step.key === 'submitted';
          const isActive = stepStatus === 'active';
          
          // Don't show connecting/complete explicitly as spinner steps unless active
          if ((step.key === 'connecting' || step.key === 'complete') && !isActive && !isDone) return null;

          return (
            <div key={step.key} className={`flex items-start gap-4 ${!isDone && !isActive ? 'opacity-50' : ''}`}>
              <div className="mt-1">
                {isDone ? (
                  <CheckCircle2 className="text-green-500 w-5 h-5" />
                ) : isActive ? (
                  <Loader2 className="text-blue-500 w-5 h-5 animate-spin" />
                ) : (
                  <Circle className="text-gray-600 w-5 h-5" />
                )}
              </div>
              <div>
                <p className={`font-medium ${isDone ? 'text-gray-300' : isActive ? 'text-blue-400' : 'text-gray-500'}`}>
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {status === 'complete' && (
        <div className="mt-10 flex justify-end">
          <button
            onClick={handleManualComplete}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20"
          >
            View Report →
          </button>
        </div>
      )}
    </div>
  );
}
