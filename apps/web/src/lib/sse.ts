import { useState, useEffect } from 'react';

export type AuditStatus = 'idle' | 'connecting' | 'analyzing' | 'storing' | 'complete' | 'error';

export function useAuditProgress(auditId: string | null) {
  const [status, setStatus] = useState<AuditStatus>('idle');
  const [pct, setPct] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [blobId, setBlobId] = useState<string | null>(null);
  const [walrusUrl, setWalrusUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auditId) {
      setStatus('idle');
      return;
    }

    setStatus('connecting');
    setMessage('Connecting to audit stream...');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const eventSource = new EventSource(`${API_URL}/audit/${auditId}/status`);

    eventSource.addEventListener('progress', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setStatus(data.step === 'storing' ? 'storing' : 'analyzing');
        setPct(data.pct);
        setMessage(data.message);
      } catch (err) {
        console.error('Failed to parse progress event:', err);
      }
    });

    eventSource.addEventListener('complete', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setStatus('complete');
        setPct(100);
        setMessage('Audit complete!');
        setBlobId(data.blobId);
        setWalrusUrl(data.walrusUrl);
        eventSource.close();
      } catch (err) {
        console.error('Failed to parse complete event:', err);
      }
    });

    eventSource.addEventListener('error', (e: MessageEvent) => {
      try {
        // e.data might be undefined if it's a connection error rather than a server error event
        if (e.data) {
          const data = JSON.parse(e.data);
          setError(data.errorMessage || 'An error occurred during audit');
        } else {
          setError('Connection lost or failed to connect to audit stream.');
        }
      } catch (err) {
        setError('An error occurred during audit');
      }
      setStatus('error');
      eventSource.close();
    });

    // Native EventSource error handler (connection drop, etc.)
    eventSource.onerror = (e) => {
      // If we're already complete or error, ignore
      setStatus((prev) => {
        if (prev === 'complete' || prev === 'error') return prev;
        setError('Connection to audit stream failed.');
        return 'error';
      });
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [auditId]);

  return { status, pct, message, blobId, walrusUrl, error };
}
