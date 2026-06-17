'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Loader2, Search, Ban, CheckCircle2, Trash2 } from 'lucide-react';
import { UserDetailPanel, shortSui, userLabel } from '@/components/admin/AdminUI';
import { Dialog, type DialogState } from '@/components/admin/Dialog';

const PLANS = ['FREE', 'DEVELOPER', 'TEAM', 'ENTERPRISE'];

export default function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api.getAdminUsers(1, 100)
      .then((res) => setUsers(res.data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const showError = (title: string, message?: string) =>
    setDialog({ title, message, variant: 'danger' });

  const patchUser = (id: string, changes: any) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...changes } : u)));
    setSelected((prev: any) => (prev && prev.id === id ? { ...prev, ...changes } : prev));
  };

  const handlePlanChange = async (id: string, plan: string) => {
    try {
      await api.updateUserPlan(id, plan);
      patchUser(id, { subscription: { plan } });
    } catch (e: any) {
      showError('Failed to update plan', e.message);
    }
  };

  const performToggleBlock = async (id: string, isBlocked: boolean) => {
    try {
      await api.setUserBlocked(id, isBlocked);
      patchUser(id, { isBlocked });
    } catch (e: any) {
      showError('Failed to update status', e.message);
    }
  };

  const handleToggleBlock = (id: string, isBlocked: boolean) => {
    const label = userLabel(users.find((u) => u.id === id) || selected);
    setDialog({
      title: isBlocked ? 'Block user?' : 'Unblock user?',
      message: isBlocked
        ? `${label} will be signed out and unable to log in until you unblock them.`
        : `${label} will be able to log in again.`,
      variant: isBlocked ? 'danger' : 'default',
      confirmLabel: isBlocked ? 'Block' : 'Unblock',
      onConfirm: () => performToggleBlock(id, isBlocked),
    });
  };

  const performDelete = async (id: string) => {
    try {
      await api.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSelected(null);
    } catch (e: any) {
      showError('Failed to delete user', e.message);
    }
  };

  const handleDelete = (id: string) => {
    const label = userLabel(users.find((u) => u.id === id) || selected);
    setDialog({
      title: 'Delete user?',
      message: `Permanently delete ${label} and all of their data. This cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: () => performDelete(id),
    });
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setSelected({ id });
    try {
      const detail = await api.getAdminUserDetail(id);
      setSelected(detail);
    } catch (e: any) {
      showError('Failed to load user', e.message);
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Exclude the signed-in admin's own account from the management list.
  const filtered = users.filter((u) => {
    if (currentUser && u.id === currentUser.id) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.suiAddress?.toLowerCase().includes(q)
    );
  });

  if (error) return <div className="py-20 text-center text-sm text-zinc-400">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or Slush id"
          className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs rounded-md pl-9 pr-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="rounded-lg surface overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
        ) : filtered.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/50">
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Joined</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Audits</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Plan</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const primary = u.name || (u.suiAddress ? shortSui(u.suiAddress) : u.email);
                const secondary = u.name ? u.email : (u.suiAddress ? 'Slush wallet' : '');
                return (
                  <tr
                    key={u.id}
                    onClick={() => openDetail(u.id)}
                    className="border-b border-zinc-800/30 last:border-0 hover:bg-white/[0.015] cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className={`text-sm text-white font-medium ${!u.name && u.suiAddress ? 'font-mono' : ''}`}>{primary}</div>
                      {secondary && <div className="text-[11px] text-zinc-600">{secondary}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{u.role}</td>
                    <td className="px-4 py-3">
                      {u.isBlocked ? (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Blocked</span>
                      ) : (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500 text-right">{u._count?.audits || 0}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={u.subscription?.plan || 'FREE'}
                        onChange={(e) => handlePlanChange(u.id, e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-md px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                      >
                        {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleBlock(u.id, !u.isBlocked)}
                          title={u.isBlocked ? 'Unblock' : 'Block'}
                          className={`p-1.5 rounded-md border transition-colors ${
                            u.isBlocked
                              ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                              : 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10'
                          }`}
                        >
                          {u.isBlocked ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          title="Delete"
                          className="p-1.5 rounded-md border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-zinc-600 text-sm">No users found.</div>
        )}
      </div>

      {selected && (
        <UserDetailPanel
          user={selected}
          loading={detailLoading}
          onClose={() => setSelected(null)}
          onPlanChange={handlePlanChange}
          onToggleBlock={handleToggleBlock}
          onDelete={handleDelete}
        />
      )}

      <Dialog state={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
