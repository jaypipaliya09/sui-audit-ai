'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { RiskBadge } from '@/components/RiskBadge';
import { Clock, Search, Filter, Loader2, ChevronLeft, ChevronRight, Scale } from 'lucide-react';

const RISK_FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'CLEAN'];

export default function HistoryPage() {
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const router = useRouter();
  const limit = 15;

  useEffect(() => {
    setLoading(true);
    api.getReports(page, limit)
      .then((res) => {
        setAudits(res.data || []);
        setTotal(res.total || 0);
      })
      .catch(() => setAudits([]))
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = audits.filter((a) => {
    const matchRisk = riskFilter === 'ALL' || a.overallRisk === riskFilter;
    const matchSearch = !search || (a.contractName || '').toLowerCase().includes(search.toLowerCase());
    return matchRisk && matchSearch;
  });

  const totalPages = Math.ceil(total / limit);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleCompareSubmit = () => {
    if (selectedIds.length === 2) {
      router.push(`/compare?previous=${selectedIds[1]}&current=${selectedIds[0]}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit History</h1>
        <p className="text-gray-500 text-sm mt-1">All your past audits in one place.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            placeholder="Search by contract name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-indigo-500/50 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {RISK_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setRiskFilter(filter)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                riskFilter === filter
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'bg-[#1a1a1a] text-gray-500 border border-[#2a2a2a] hover:text-gray-300'
              }`}
            >
              {filter}
            </button>
          ))}
          <div className="w-px bg-gray-800 mx-2" />
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedIds([]);
            }}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              compareMode
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:text-gray-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            Compare Mode
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {compareMode && <th className="px-4 py-3 text-left w-12"></th>}
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contract</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Risk</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((audit: any) => (
                <tr key={audit.id} className={`border-b border-[#2a2a2a] last:border-0 hover:bg-white/[0.02] transition-colors ${selectedIds.includes(audit.id) ? 'bg-blue-500/5' : ''}`}>
                  {compareMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={!selectedIds.includes(audit.id) && selectedIds.length >= 2}
                        checked={selectedIds.includes(audit.id)}
                        onChange={() => toggleSelection(audit.id)}
                        className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500/20 focus:ring-offset-0 bg-[#0f0f0f]"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className="text-sm text-white font-medium">{audit.contractName || 'Untitled'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={audit.overallRisk || 'INFO'} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${audit.status === 'COMPLETE' ? 'text-green-400' : audit.status === 'FAILED' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {audit.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(audit.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {audit.blobId ? (
                      <Link href={`/report/${audit.blobId}`} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                        View →
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2a2a]">
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl">
          <Clock className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No audits found matching your criteria.</p>
        </div>
      )}

      {/* Floating Compare Action */}
      {compareMode && selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#2a2a2a] shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-8">
          <span className="text-sm font-medium text-gray-300">
            <span className="text-white">{selectedIds.length}</span> of 2 selected
          </span>
          <button
            onClick={handleCompareSubmit}
            disabled={selectedIds.length !== 2}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-medium px-4 py-2 rounded-full transition-all"
          >
            Compare Audits
          </button>
        </div>
      )}
    </div>
  );
}
