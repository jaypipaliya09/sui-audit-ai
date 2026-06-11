'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AuditFinding } from '@sui-audit-ai/shared-types';

interface SeverityChartProps {
  findings: AuditFinding[];
}

export default function SeverityChart({ findings }: SeverityChartProps) {
  // Count findings by severity
  const counts = {
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
    { name: 'Critical', value: counts.CRITICAL, color: '#ef4444' }, // red-500
    { name: 'High', value: counts.HIGH, color: '#f97316' },     // orange-500
    { name: 'Medium', value: counts.MEDIUM, color: '#eab308' },   // yellow-500
    { name: 'Low', value: counts.LOW, color: '#3b82f6' },      // blue-500
    { name: 'Info', value: counts.INFO, color: '#6b7280' },     // gray-500
  ];

  // Only show bars with at least 1 finding
  const data = rawData.filter((item) => item.value > 0);

  if (data.length === 0) {
    return null;
  }

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1e1e1e] border border-gray-700 px-3 py-2 rounded shadow-lg">
          <p className="text-white text-sm font-medium">{`${data.name}: ${data.value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[200px] bg-[#121212] border border-gray-800 rounded-xl p-4 shadow-lg mb-8">
      <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Findings by Severity</h3>
      <div className="w-full h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9ca3af', fontSize: 12 }} 
              width={60}
            />
            <Tooltip cursor={{ fill: '#1f2937', opacity: 0.4 }} content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#d1d5db', fontSize: 12 }}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
