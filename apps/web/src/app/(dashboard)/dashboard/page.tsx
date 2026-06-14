'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { RiskBadge } from '@/components/RiskBadge';
import {
  PlusCircle, Clock, ArrowRight, BarChart3,
  Shield, AlertTriangle, Loader2, GitBranch
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ used: 0, limit: 50, resetDate: '' });

  useEffect(() => {
    Promise.all([
      api.getReports(1, 10).catch(() => ({ data: [], total: 0 })),
      api.getBillingStatus().catch(() => null),
    ]).then(([reports, billing]) => {
      setAudits(reports.data || []);
      if (billing) {
        setUsage({
          used: billing.auditsUsed || 0,
          limit: billing.auditsLimit || 50,
          resetDate: billing.resetDate || '',
        });
      }
      setLoading(false);
    });
  }, []);

  const usagePct = Math.min((usage.used / usage.limit) * 100, 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name || 'User'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-white font-semibold rounded-xl transition-all text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Single Contract
          </Link>
          <Link
            href="/repo-audit/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 text-sm"
          >
            <GitBranch className="w-4 h-4" />
            New Repo Audit
          </Link>
        </div>
      </div>

      {/* Usage Card */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-white text-sm">Monthly Usage</h3>
          </div>
          <span className="text-sm text-gray-500">
            {usage.used}/{usage.limit} audits
          </span>
        </div>
        <div className="w-full h-2 bg-[#0f0f0f] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              usagePct > 80 ? 'bg-red-500' : usagePct > 60 ? 'bg-yellow-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        {usage.resetDate && (
          <p className="text-xs text-gray-600 mt-2">
            Resets {new Date(usage.resetDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Recent Audits */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            Recent Audits
          </h3>
          <Link href="/history" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : audits.length > 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contract</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Risk</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {audits.slice(0, 5).map((audit: any) => (
                  <tr key={audit.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm text-white font-medium">{audit.contractName || 'Untitled'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge level={audit.overallRisk || audit.status || 'INFO'} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {audit.blobId ? (
                        <Link
                          href={`/report/${audit.blobId}`}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                        >
                          View Report →
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-600">Processing...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl">
            <Shield className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-600 text-sm mb-3">No audits yet</p>
            <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              Run your first audit →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
