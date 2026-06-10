import React from 'react';

type BadgeType = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | 'CLEAN';

interface RiskBadgeProps {
  level: BadgeType | string;
  className?: string;
}

export function RiskBadge({ level, className = '' }: RiskBadgeProps) {
  let colorClass = '';

  switch (level.toUpperCase()) {
    case 'CRITICAL':
      colorClass = 'bg-red-500/20 text-red-400 border-red-500/30';
      break;
    case 'HIGH':
      colorClass = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      break;
    case 'MEDIUM':
      colorClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      break;
    case 'LOW':
      colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      break;
    case 'CLEAN':
      colorClass = 'bg-green-500/20 text-green-400 border-green-500/30';
      break;
    case 'INFO':
    default:
      colorClass = 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass} ${className}`}
    >
      {level.toUpperCase()}
    </span>
  );
}
