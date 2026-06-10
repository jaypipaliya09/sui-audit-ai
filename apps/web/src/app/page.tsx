'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContractEditor } from '@/components/ContractEditor';
import { RiskBadge } from '@/components/RiskBadge';

export default function Home() {
  const router = useRouter();
  const [contractCode, setContractCode] = useState('');
  const [contractName, setContractName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);

  useEffect(() => {
    // Fetch recent audits
    const fetchRecent = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/reports?limit=5`);
        if (res.ok) {
          const data = await res.json();
          setRecentAudits(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch recent audits:', err);
      }
    };
    fetchRecent();
  }, []);

  const handleSubmit = async () => {
    if (!contractCode || !contractName) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/audit/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractCode,
          contractName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit audit');
      }

      router.push(`/audit/${data.auditId}`);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  const isFormValid = contractCode.length > 0 && contractName.length > 0;

  return (
    <main className="min-h-screen bg-[#0d1117] text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 tracking-tight">
            AI Move Contract Auditor
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Paste your Sui Move contract. Get a structured security audit in 60 seconds. Stored permanently on Walrus.
          </p>
        </div>

        {/* Main Editor Section */}
        <div className="bg-[#121212] border border-gray-800 rounded-xl shadow-2xl p-6 space-y-6">
          <ContractEditor 
            value={contractCode} 
            onChange={setContractCode} 
            disabled={isSubmitting} 
          />

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="contractName" className="block text-sm font-medium text-gray-400 mb-2">
                Contract Name <span className="text-red-400">*</span>
              </label>
              <input
                id="contractName"
                type="text"
                placeholder="e.g. vulnerable_defi::vault"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-[#1e1e1e] border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 h-[50px]"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Queuing audit...
                  </>
                ) : (
                  'Run Security Audit →'
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Recent Audits */}
        {recentAudits.length > 0 && (
          <div className="pt-8 border-t border-gray-800">
            <h2 className="text-xl font-semibold text-white mb-6">Recent Audits</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentAudits.map((audit) => (
                <div 
                  key={audit.id}
                  onClick={() => audit.blobId && router.push(`/report/${audit.blobId}`)}
                  className={`p-4 rounded-lg border border-gray-800 bg-[#121212] hover:bg-gray-800/50 transition-colors ${audit.blobId ? 'cursor-pointer' : 'opacity-50'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-200 truncate pr-2">{audit.contractName}</h3>
                    <RiskBadge level={audit.overallRisk || audit.status} className="shrink-0" />
                  </div>
                  <div className="text-xs text-gray-500 flex items-center justify-between">
                    <span>
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </span>
                    <span className="font-mono">{audit.blobId ? `${audit.blobId.slice(0, 8)}...` : 'Pending'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
