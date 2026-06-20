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
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or Slush id..."
          className="w-full bg-obsidian border border-white/[0.06] text-ivory text-[13px] rounded-xl pl-11 pr-4 py-3 focus:border-emerald-500/40 focus:outline-none placeholder-zinc-600 shadow-inner transition-colors"
        />
      </div>

      <div className="glass-panel overflow-hidden border border-emerald-500/10 shadow-premium-sm">
        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500/50" /></div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                  <th className="text-left px-5 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">User</th>
                  <th className="text-left px-5 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Role</th>
                  <th className="text-left px-5 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="text-left px-5 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Joined</th>
                  <th className="text-right px-5 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Audits</th>
                  <th className="text-left px-5 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Plan</th>
                  <th className="text-right px-5 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Actions</th>
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
                      className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <div className={`text-[13px] text-ivory font-bold ${!u.name && u.suiAddress ? 'font-mono' : ''}`}>{primary}</div>
                        {secondary && <div className="text-[11px] text-zinc-500 font-medium mt-0.5">{secondary}</div>}
                      </td>
                      <td className="px-5 py-4 text-[12px] font-bold uppercase tracking-wider text-zinc-400">{u.role}</td>
                      <td className="px-5 py-4">
                        {u.isBlocked ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">Blocked</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-[12px] text-zinc-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-[12px] font-mono text-zinc-400 text-right">{u._count?.audits || 0}</td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={u.subscription?.plan || 'FREE'}
                          onChange={(e) => handlePlanChange(u.id, e.target.value)}
                          className="bg-obsidian border border-white/[0.06] text-ivory text-[11px] font-bold tracking-wider rounded-lg px-2.5 py-1.5 focus:border-emerald-500/40 focus:outline-none appearance-none cursor-pointer"
                        >
                          {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleToggleBlock(u.id, !u.isBlocked)}
                            title={u.isBlocked ? 'Unblock' : 'Block'}
                            className={`p-2 rounded-lg border transition-colors ${
                              u.isBlocked
                                ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                                : 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10'
                            }`}
                          >
                            {u.isBlocked ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            title="Delete"
                            className="p-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 text-zinc-500 text-sm font-medium">No users found.</div>
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
