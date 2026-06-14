'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { GitBranch, Search, Play, FileCode, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

const TRACKS = [
  { id: 'DEFI', name: 'DeFi & AMM' },
  { id: 'GAMING', name: 'Gaming & NFTs' },
  { id: 'AI', name: 'AI & Inference' },
  { id: 'PAYMENTS', name: 'Payments' },
  { id: 'INSTITUTIONS_CAPITAL_MARKETS', name: 'Institutions & Capital Markets' },
];

export default function NewRepoAuditPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');

  const [projectTrack, setProjectTrack] = useState('DEFI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleScan = async () => {
    if (!repoUrl) return;
    setIsScanning(true);
    setScanError('');
    setScanResult(null);

    try {
      const res = await api.scanRepo({ repoUrl });
      setScanResult(res);
    } catch (err: any) {
      setScanError(err.message || 'Failed to scan repository. Ensure it is public and contains .move files.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async () => {
    if (!scanResult) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await api.submitRepoAudit({
        scanId: scanResult.scanId,
        projectTrack,
      });
      router.push(`/repo-audit/${res.repoAuditId}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit repository audit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <GitBranch className="w-6 h-6" />
          GitHub Repository Audit
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Scan and analyze an entire GitHub repository for Move smart contract vulnerabilities.
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Scan */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h2 className="text-lg font-semibold text-white">Scan Repository</h2>
          </div>

          <div className="space-y-4 ml-11">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                GitHub Repository URL
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    disabled={isScanning || !!scanResult}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] focus:border-blue-500/50 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  />
                </div>
                {!scanResult && (
                  <button
                    onClick={handleScan}
                    disabled={!repoUrl || isScanning}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-medium rounded-xl transition-all text-sm"
                  >
                    {isScanning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Scan
                  </button>
                )}
                {scanResult && (
                  <button
                    onClick={() => {
                      setScanResult(null);
                      setRepoUrl('');
                    }}
                    className="px-4 py-2.5 bg-[#2a2a2a] hover:bg-[#333] text-white font-medium rounded-xl transition-all text-sm"
                  >
                    Change Repo
                  </button>
                )}
              </div>
            </div>

            {scanError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{scanError}</p>
              </div>
            )}

            {scanResult && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold text-green-400">Scan Complete</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Repository:</span>
                    <span className="ml-2 text-white font-medium">
                      {scanResult.repoOwner}/{scanResult.repoName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Commit SHA:</span>
                    <span className="ml-2 text-white font-mono text-xs">
                      {scanResult.commitSha?.slice(0, 7)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Files Found:</span>
                    <span className="ml-2 text-white font-medium flex items-center gap-1.5 mt-1">
                      <FileCode className="w-4 h-4 text-blue-400" />
                      {scanResult.estimatedAudits} Move contracts ready for analysis
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Submit */}
        <div
          className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 transition-all duration-300 ${
            !scanResult ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h2 className="text-lg font-semibold text-white">Configure & Submit</h2>
          </div>

          <div className="space-y-6 ml-11">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Project Track
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Selecting the right track helps the AI apply context-specific vulnerability checks (e.g., flash loans for DeFi).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TRACKS.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setProjectTrack(track.id)}
                    className={`p-3 text-left rounded-xl border text-sm transition-all ${
                      projectTrack === track.id
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300'
                        : 'bg-[#0f0f0f] border-[#2a2a2a] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {track.name}
                  </button>
                ))}
              </div>
            </div>

            {submitError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{submitError}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !scanResult}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Initiating Audit...
                </>
              ) : (
                <>
                  Submit Repository Audit
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-500">
              This will deduct {scanResult?.estimatedAudits || 0} credits from your plan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
