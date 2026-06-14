'use client';

import React from 'react';
import { FileCode2, GitBranch } from 'lucide-react';

interface AuditMethodSelectorProps {
  selected: 'single' | 'repo' | null;
  onSelect: (method: 'single' | 'repo') => void;
}

export function AuditMethodSelector({ selected, onSelect }: AuditMethodSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Single Contract */}
      <button
        onClick={() => onSelect('single')}
        className={`group p-6 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 ${
          selected === 'single'
            ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
            : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]'
        }`}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
          selected === 'single' ? 'bg-indigo-500/20' : 'bg-[#0f0f0f]'
        }`}>
          <FileCode2 className={`w-6 h-6 ${selected === 'single' ? 'text-indigo-400' : 'text-gray-500'}`} />
        </div>
        <h3 className={`font-bold mb-1 ${selected === 'single' ? 'text-indigo-400' : 'text-white'}`}>
          📄 Single Contract
        </h3>
        <p className="text-sm text-gray-500">Upload or paste one .move file for analysis.</p>
      </button>

      {/* GitHub Repo */}
      <button
        onClick={() => onSelect('repo')}
        className={`group p-6 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 ${
          selected === 'repo'
            ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
            : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]'
        }`}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
          selected === 'repo' ? 'bg-indigo-500/20' : 'bg-[#0f0f0f]'
        }`}>
          <GitBranch className={`w-6 h-6 ${selected === 'repo' ? 'text-indigo-400' : 'text-gray-500'}`} />
        </div>
        <h3 className={`font-bold mb-1 ${selected === 'repo' ? 'text-indigo-400' : 'text-white'}`}>
          🐙 GitHub Repository
        </h3>
        <p className="text-sm text-gray-500">Paste your GitHub URL. We find all .move files automatically.</p>
      </button>
    </div>
  );
}
