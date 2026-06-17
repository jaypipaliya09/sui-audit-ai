'use client';

import { AlertTriangle, Info } from 'lucide-react';

export interface DialogState {
  title: string;
  message?: string;
  variant?: 'default' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
}

export function Dialog({ state, onClose }: { state: DialogState | null; onClose: () => void }) {
  if (!state) return null;

  const isDanger = state.variant === 'danger';
  const isConfirm = typeof state.onConfirm === 'function';

  const handleConfirm = () => {
    state.onConfirm?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-[#0c0c0e] border border-zinc-800 p-5 shadow-2xl animate-fadeIn">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isDanger ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400'
          }`}>
            {isDanger ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </div>
          <div className="min-w-0 pt-0.5 flex-1">
            <h3 className="text-sm font-semibold text-white break-words">{state.title}</h3>
            {state.message && (
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed break-words">{state.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          {isConfirm && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 border border-zinc-800 hover:bg-white/[0.03] transition-colors"
            >
              {state.cancelLabel || 'Cancel'}
            </button>
          )}
          <button
            onClick={isConfirm ? handleConfirm : onClose}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              isDanger
                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                : 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10'
            }`}
          >
            {state.confirmLabel || (isConfirm ? 'Confirm' : 'OK')}
          </button>
        </div>
      </div>
    </div>
  );
}
