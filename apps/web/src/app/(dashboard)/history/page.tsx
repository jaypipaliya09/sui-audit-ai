'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { RiskBadge } from '@/components/RiskBadge';
import { Clock, Search, Loader2, ChevronLeft, ChevronRight, Scale, FileCode2, GitBranch } from 'lucide-react';

const RISK_FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'CLEAN'];
const TYPE_TABS = ['All', 'Single', 'Repository'];

export default function HistoryPage() {
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('All');
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
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-display font-medium text-ivory tracking-tight">Audit History</h1>
        <p className="text-xs text-zinc-500 mt-1">Browse all your past audits.</p>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            type="text"
            placeholder="Search by contract name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-9 py-2 text-xs"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {RISK_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setRiskFilter(filter)}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                riskFilter === filter
                  ? 'bg-jade-500/10 text-jade-400 border border-jade-500/20'
                  : 'text-zinc-600 border border-zinc-800 hover:text-zinc-400 hover:border-zinc-700'
              }`}
            >
              {filter}
            </button>
          ))}
          <div className="w-px bg-zinc-800 mx-1" />
          <button
            onClick={() => { setCompareMode(!compareMode); setSelectedIds([]); }}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              compareMode
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'text-zinc-600 border border-zinc-800 hover:text-zinc-400'
            }`}
          >
            <Scale className="w-3 h-3" />
            Compare
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="rounded-lg surface overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/50">
                {compareMode && <th className="px-4 py-2.5 text-left w-10" />}
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Contract</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Risk</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Date</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((audit: any) => (
                <tr
                  key={audit.id}
                  className={`border-b border-zinc-800/30 last:border-0 hover:bg-white/[0.015] transition-colors ${
                    selectedIds.includes(audit.id) ? 'bg-blue-500/5' : ''
                  }`}
                >
                  {compareMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={!selectedIds.includes(audit.id) && selectedIds.length >= 2}
                        checked={selectedIds.includes(audit.id)}
                        onChange={() => toggleSelection(audit.id)}
                        className="w-3.5 h-3.5 rounded border-zinc-700 text-jade-500 focus:ring-jade-500/20 focus:ring-offset-0 bg-zinc-900"
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
                    <span className={`text-xs font-medium ${
                      audit.status === 'COMPLETE' ? 'text-emerald-400' :
                      audit.status === 'FAILED' ? 'text-red-400' :
                      'text-amber-400'
                    }`}>
                      {audit.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(audit.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {audit.blobId ? (
                      <Link href={`/report/${audit.blobId}`} className="text-xs text-jade-400 hover:text-jade-300 font-medium">
                        View →
                      </Link>
                    ) : (
                      <span className="text-xs text-zinc-700">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800/50">
              <span className="text-[11px] text-zinc-600">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 rounded-lg surface">
          <Clock className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
          <p className="text-sm text-zinc-600">No audits found.</p>
        </div>
      )}

      {/* Compare floating bar */}
      {compareMode && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-panel shadow-premium-lg px-5 py-3 flex items-center gap-4 z-50 animate-fadeInUp">
          <span className="text-xs text-zinc-400">
            <span className="text-white font-medium">{selectedIds.length}</span> of 2 selected
          </span>
          <button
            onClick={handleCompareSubmit}
            disabled={selectedIds.length !== 2}
            className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40"
          >
            Compare
          </button>
        </div>
      )}
    </div>
  );
}
