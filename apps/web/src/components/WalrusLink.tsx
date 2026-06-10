'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';

interface WalrusLinkProps {
  blobId: string;
  walrusUrl: string;
}

export function WalrusLink({ blobId, walrusUrl }: WalrusLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walrusUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="bg-[#121212] border border-gray-800 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h4 className="text-white font-medium mb-1">Permanently Stored on Walrus Network</h4>
        <p className="text-sm text-gray-400 font-mono break-all">{blobId}</p>
      </div>
      
      <div className="flex gap-2 w-full sm:w-auto">
        <button
          onClick={handleCopy}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy URL'}
        </button>
        <a
          href={walrusUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View Raw
        </a>
      </div>
    </div>
  );
}
