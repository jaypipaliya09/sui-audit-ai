'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AuditFinding } from '@sui-audit-ai/shared-types';

interface SeverityChartProps {
  findings: AuditFinding[];
}

export default function SeverityChart({ findings }: SeverityChartProps) {
  const counts: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };

  findings.forEach((f) => {
    if (counts[f.severity] !== undefined) {
      counts[f.severity]++;
    }
  });

  const rawData = [
    { name: 'Critical', value: counts.CRITICAL, color: '#ef4444' },
    { name: 'High', value: counts.HIGH, color: '#f97316' },
    { name: 'Medium', value: counts.MEDIUM, color: '#eab308' },
    { name: 'Low', value: counts.LOW, color: '#3b82f6' },
    { name: 'Info', value: counts.INFO, color: '#71717a' },
  ];

  const data = rawData.filter((item) => item.value > 0);

  if (data.length === 0) return null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-md shadow-lg">
          <p className="text-white text-xs font-medium">{`${d.name}: ${d.value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[180px] rounded-lg surface p-4">
      <h3 className="text-[11px] font-medium text-zinc-500 mb-3 uppercase tracking-wider">Findings by Severity</h3>
      <div className="w-full h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 0, right: 30, left: 5, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 11 }}
              width={55}
            />
            <Tooltip cursor={{ fill: '#18181b', opacity: 0.5 }} content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 3, 3, 0]} label={{ position: 'right', fill: '#a1a1aa', fontSize: 11 }}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} opacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
