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
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs theme-text">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold theme-text">{title}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] theme-text-muted">
          Diagnostico
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-lg border theme-border bg-[color:var(--dash-panel)] px-3 py-2"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] theme-text-muted">
              {row.label}
            </span>
            <span className="truncate theme-text">{row.value || '-'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
