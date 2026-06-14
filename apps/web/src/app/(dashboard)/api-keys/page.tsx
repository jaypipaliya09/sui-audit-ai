'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Key, PlusCircle, Copy, Check, Trash2, Loader2, Shield } from 'lucide-react';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
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
      const res = await api.createApiKey({ name: newKeyName });
      setCreatedKey(res.rawKey);
      setNewKeyName('');
      fetchKeys();
    } catch {
      // ignore
    }
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this key?')) return;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">API Keys</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your API keys for programmatic access.</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreatedKey(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Key
        </button>
      </div>

      {/* Create Key Modal/Section */}
      {showCreate && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          {createdKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">API Key Created — copy it now, you won&apos;t see it again!</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white font-mono break-all">
                  {createdKey}
                </code>
                <button
                  onClick={() => handleCopy(createdKey)}
                  className="p-2.5 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] hover:border-indigo-500/30 text-gray-400 hover:text-white transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={() => { setShowCreate(false); setCreatedKey(null); }} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-white text-sm">Create New API Key</h3>
              <input
                type="text"
                placeholder="Key name (e.g. CI/CD Pipeline)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] focus:border-indigo-500/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  disabled={creating || !newKeyName.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  Generate Key
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keys List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : keys.length > 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Key</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key: any) => (
                <tr key={key.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-medium">{key.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{key.keyPrefix}••••••••</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(key.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors flex items-center gap-1 ml-auto"
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
        <div className="text-center py-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl">
          <Key className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No API keys yet. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}
