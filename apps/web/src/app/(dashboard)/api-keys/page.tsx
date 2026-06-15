'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Key, PlusCircle, Copy, Check, Trash2, Loader2, Shield, Clock } from 'lucide-react';

const SCOPES = [
  { id: 'audit:create', label: 'Create Audits' },
  { id: 'audit:read', label: 'Read Audits' },
  { id: 'report:read', label: 'Read Reports' },
  { id: 'repo:create', label: 'Repo Audits' },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['audit:create', 'audit:read', 'report:read']);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = () => {
    api.listApiKeys()
      .then(setKeys)
      .catch(() => setKeys([]))
      .finally(() => setLoading(false));
  };

  useEffect(fetchKeys, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await api.createApiKey({ name: newKeyName, scopes: selectedScopes });
      setCreatedKey(res.rawKey);
      setNewKeyName('');
      fetchKeys();
    } catch {
      // ignore
    }
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await api.revokeApiKey(id);
      fetchKeys();
    } catch {
      // ignore
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">API Keys</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Manage programmatic access to the API.</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreatedKey(null); }}
          className="btn-primary text-xs py-2 px-3"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          New Key
        </button>
      </div>

      {/* Create section */}
      {showCreate && (
        <div className="rounded-lg surface p-5 animate-fadeInUp">
          {createdKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-4 h-4" />
                <span className="text-xs font-medium">Key created — copy it now, you won&apos;t see it again!</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2.5 text-xs text-white font-mono break-all">
                  {createdKey}
                </code>
                <button
                  onClick={() => handleCopy(createdKey)}
                  className="p-2.5 rounded-md hover:bg-white/5 text-zinc-500 hover:text-white transition-colors border border-zinc-800"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                onClick={() => { setShowCreate(false); setCreatedKey(null); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white">Create API Key</h3>
              <input
                type="text"
                placeholder="Key name (e.g. CI/CD Pipeline)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="input-base text-xs"
              />

              {/* Scope selector */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {SCOPES.map((scope) => (
                    <label
                      key={scope.id}
                      className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-colors text-xs ${
                        selectedScopes.includes(scope.id)
                          ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-300'
                          : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope.id)}
                        onChange={() => toggleScope(scope.id)}
                        className="w-3 h-3 rounded border-zinc-700 text-indigo-500 focus:ring-indigo-500/20 focus:ring-offset-0 bg-zinc-900"
                      />
                      {scope.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={creating || !newKeyName.trim()}
                  className="btn-primary text-xs py-2 px-3"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  Generate
                </button>
                <button onClick={() => setShowCreate(false)} className="btn-ghost text-xs py-2">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keys list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
        </div>
      ) : keys.length > 0 ? (
        <div className="rounded-lg surface overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/50">
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Key</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Last Used</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Created</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider" />
              </tr>
            </thead>
            <tbody>
              {keys.map((key: any) => (
                <tr key={key.id} className="border-b border-zinc-800/30 last:border-0 hover:bg-white/[0.015] transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-medium">{key.name}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{key.keyPrefix}••••••</td>
                  <td className="px-4 py-3 text-xs text-zinc-600">
                    {key.lastUsedAt ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(key.lastUsedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      'Never'
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">{new Date(key.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="text-[11px] text-red-400/70 hover:text-red-400 font-medium transition-colors flex items-center gap-1 ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 rounded-lg surface">
          <Key className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
          <p className="text-sm text-zinc-600">No API keys yet.</p>
          <p className="text-xs text-zinc-700 mt-1">Create one to access the API programmatically.</p>
        </div>
      )}
    </div>
  );
}
