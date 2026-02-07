import React from 'react';

interface DiagnosticsRow {
  label: string;
  value: string;
}

interface DiagnosticsPanelProps {
  title: string;
  rows: DiagnosticsRow[];
}

export function DiagnosticsPanel({ title, rows }: DiagnosticsPanelProps) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
          Diagnostico
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
              {row.label}
            </span>
            <span className="truncate text-amber-900">{row.value || '-'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
