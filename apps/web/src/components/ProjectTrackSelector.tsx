'use client';

import React from 'react';

const TRACKS = [
  { id: 'institutions', label: 'Institutions', emoji: '🏦', description: 'Banking & financial institutions' },
  { id: 'ai', label: 'AI', emoji: '🤖', description: 'AI & machine learning projects' },
  { id: 'defi', label: 'DeFi', emoji: '💰', description: 'Decentralized finance protocols' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮', description: 'Gaming & metaverse' },
  { id: 'payments', label: 'Payments', emoji: '💳', description: 'Payment solutions' },
];

interface ProjectTrackSelectorProps {
  selected: string | null;
  onSelect: (id: string) => void;
}

export function ProjectTrackSelector({ selected, onSelect }: ProjectTrackSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {TRACKS.map((track) => (
        <button
          key={track.id}
          onClick={() => onSelect(track.id)}
          className={`group p-4 rounded-xl border text-center transition-all duration-200 hover:-translate-y-0.5 ${
            selected === track.id
              ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
              : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]'
          }`}
        >
          <span className="text-2xl mb-2 block">{track.emoji}</span>
          <span className={`text-sm font-semibold block ${selected === track.id ? 'text-indigo-400' : 'text-white'}`}>
            {track.label}
          </span>
          <span className="text-xs text-gray-600 mt-1 block">{track.description}</span>
        </button>
      ))}
    </div>
  );
}
