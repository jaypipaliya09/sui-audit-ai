'use client';

import React from 'react';
import { FileCode2, Check, X, Loader2 } from 'lucide-react';

interface MoveFile {
  path: string;
  name: string;
  size: number;
}

interface RepoScanPreviewProps {
  owner: string;
  repo: string;
  files: MoveFile[];
  estimatedAudits: number;
  userQuota: { used: number; limit: number };
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function RepoScanPreview({
  owner,
  repo,
  files,
  estimatedAudits,
  userQuota,
  onConfirm,
  onCancel,
  isSubmitting,
}: RepoScanPreviewProps) {
  const estimatedMinutes = Math.max(1, Math.ceil(files.length * 1.5));

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div>
        <h3 className="font-bold text-white text-lg">
          Found {files.length} Move contract{files.length !== 1 ? 's' : ''} in{' '}
          <span className="text-indigo-400">{owner}/{repo}</span>
        </h3>
      </div>

      {/* Files table */}
      <div className="max-h-60 overflow-y-auto rounded-xl border border-[#2a2a2a]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#0f0f0f]">
            <tr className="border-b border-[#2a2a2a]">
              <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">File</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Path</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Size</th>
              <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">Include</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, i) => (
              <tr key={i} className="border-b border-[#2a2a2a] last:border-0">
                <td className="px-3 py-2 text-white font-medium flex items-center gap-2">
                  <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
                  {file.name}
                </td>
                <td className="px-3 py-2 text-gray-500 font-mono text-xs">{file.path}</td>
                <td className="px-3 py-2 text-gray-500 text-right">{(file.size / 1024).toFixed(1)}KB</td>
                <td className="px-3 py-2 text-center">
                  <Check className="w-4 h-4 text-green-400 mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="flex flex-col sm:flex-row gap-4 text-sm">
        <div className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3">
          <span className="text-gray-500">Estimated time:</span>{' '}
          <span className="text-white font-medium">~{estimatedMinutes} minutes</span>
        </div>
        <div className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3">
          <span className="text-gray-500">Credits needed:</span>{' '}
          <span className="text-white font-medium">
            {estimatedAudits} of your {userQuota.limit - userQuota.used} remaining
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isSubmitting ? 'Submitting...' : 'Run Full Audit'}
        </button>
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-3 bg-[#0f0f0f] border border-[#2a2a2a] text-gray-400 hover:text-white font-medium rounded-xl transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
