'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { User, Code, Copy, Check, Loader2, Save, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [badgeBlobId, setBadgeBlobId] = useState('');
  const [badgeCopied, setBadgeCopied] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Profile save would go here
      await new Promise((r) => setTimeout(r, 500));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleCopyBadge = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const markdown = `[![MoveAuditor](${apiUrl}/badge/${badgeBlobId})](${window.location.origin}/report/${badgeBlobId})`;
    await navigator.clipboard.writeText(markdown);
    setBadgeCopied(true);
    setTimeout(() => setBadgeCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-xl animate-fadeIn">
      <div>
        <h1 className="text-2xl font-display font-medium text-ivory tracking-tight">Settings</h1>
        <p className="text-xs text-zinc-500 mt-1">Manage your profile and preferences.</p>
      </div>

      {/* Profile */}
      <div className="glass-panel p-5 animate-fadeInUp">
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-zinc-400" />
          Profile
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="input-base text-xs opacity-50 cursor-not-allowed"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-xs py-2"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Badge Embed */}
      <div className="glass-panel p-5 animate-fadeInUp" style={{ animationDelay: '0.08s' }}>
        <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
          <Code className="w-4 h-4 text-blue-400" />
          Embeddable Badge
        </h3>
        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
          Add an audit status badge to your repository README. Enter a Blob ID from any completed audit to generate the embed code.
        </p>

        <div className="space-y-3">
          <input
            type="text"
            value={badgeBlobId}
            onChange={(e) => setBadgeBlobId(e.target.value)}
            placeholder="Enter audit Blob ID"
            className="input-base text-xs"
          />

          {badgeBlobId && (
            <div className="space-y-3 animate-fadeIn">
              {/* Preview */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-center">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/badge/${badgeBlobId}`}
                  alt="Audit Badge"
                  className="h-5"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>

              {/* Markdown */}
              <div className="relative group">
                <pre className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-md text-[11px] font-mono text-zinc-400 overflow-x-auto">
                  {`[![MoveAuditor](${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/badge/${badgeBlobId})](${typeof window !== 'undefined' ? window.location.origin : ''}/report/${badgeBlobId})`}
                </pre>
                <button
                  onClick={handleCopyBadge}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-zinc-800 text-zinc-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                >
                  {badgeCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
