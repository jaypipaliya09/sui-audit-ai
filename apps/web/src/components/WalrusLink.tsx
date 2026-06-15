'use client';

import { Copy, Check, ExternalLink, Database } from 'lucide-react';
import { useState } from 'react';

interface WalrusLinkProps {
  blobId: string;
  walrusUrl?: string;
}

export function WalrusLink({ blobId, walrusUrl }: WalrusLinkProps) {
  const [copied, setCopied] = useState(false);
  const url = walrusUrl || `https://aggregator-devnet.walrus.space/v1/blobs/${blobId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg surface">
      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center shrink-0">
        <Database className="w-4 h-4 text-cyan-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-400 mb-0.5">Permanent Storage — Walrus Network</p>
        <p className="text-xs text-zinc-600 font-mono truncate">{blobId}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleCopy}
          className="p-2 rounded-md hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
          title="Copy URL"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-md hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
          title="View on Walrus"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
