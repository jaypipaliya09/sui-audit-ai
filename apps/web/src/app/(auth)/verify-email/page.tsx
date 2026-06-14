'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    api.verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message || 'Your email has been verified successfully!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired.');
      });
  }, [token]);

  return (
    <div className="text-center py-8">
      {status === 'loading' && (
        <>
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Verifying your email...</h2>
          <p className="text-gray-500 text-sm">Please wait while we verify your email address.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Email Verified!</h2>
          <p className="text-gray-400 text-sm mb-6">{message}</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all"
          >
            Continue to Login
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
          <p className="text-gray-400 text-sm mb-6">{message}</p>
          <Link
            href="/register"
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
          >
            Try registering again →
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-8">
        <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
