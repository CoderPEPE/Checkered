"use client";

import type { Tournament } from "../types";

function formatUSDC(amount: string) {
  const val = Number(amount) / 1_000_000;
  return val < 1 ? val.toFixed(2) : val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
}

const STATUS_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  Created: { color: "text-emerald-400", dot: "bg-emerald-400", label: "Open" },
  RegistrationClosed: { color: "text-amber-400", dot: "bg-amber-400", label: "Closed" },
  Racing: { color: "text-blue-400", dot: "bg-blue-400", label: "Live" },
  ResultsSubmitted: { color: "text-violet-400", dot: "bg-violet-400", label: "Results" },
  Completed: { color: "text-zinc-500", dot: "bg-zinc-500", label: "Done" },
  Cancelled: { color: "text-red-400", dot: "bg-red-400", label: "Cancelled" },
};

interface Props {
  tournaments: Tournament[];
  loading: boolean;
  onSelect: (id: number) => void;
}

export default function TournamentList({ tournaments, loading, onSelect }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="tournament-card p-6">
            <div className="skeleton h-3 w-16 mb-6" />
            <div className="skeleton h-4 w-3/4 mb-5" />
            <div className="skeleton h-9 w-24 mb-2" />
            <div className="skeleton h-3 w-12 mb-6" />
            <div className="skeleton h-1 w-full mb-5" />
            <div className="skeleton h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-700">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-500">No tournaments yet</p>
        <p className="text-xs text-zinc-700 mt-1">Create one to get started</p>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-[13px] font-semibold text-zinc-400">Tournaments</h2>
        <span className="text-[11px] tabular-nums text-zinc-600 bg-white/[0.03] px-2 py-0.5 rounded-md">
          {tournaments.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tournaments.map((t) => {
          const cfg = STATUS_CONFIG[t.statusName] || { color: "text-zinc-400", dot: "bg-zinc-400", label: t.statusName };
          const fillPct = t.maxPlayers > 0 ? (t.registeredCount / t.maxPlayers) * 100 : 0;
          const isOpen = t.statusName === "Created";

          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="tournament-card p-6 text-left cursor-pointer group"
            >
              {/* Status row */}
              <div className="flex items-center justify-between mb-5">
                <div className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider ${cfg.color}`}>
                  <span className={`w-[6px] h-[6px] rounded-full ${cfg.dot} ${isOpen ? 'animate-pulse' : ''}`} />
                  {cfg.label}
                </div>
                <span className="text-[11px] text-zinc-700 tabular-nums font-mono">#{t.id}</span>
              </div>

              {/* Name */}
              <h3 className="text-base font-semibold text-zinc-200 group-hover:text-white transition-colors mb-5 leading-tight">
                {t.name}
              </h3>

              {/* Entry fee */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-[32px] font-bold text-white tabular-nums leading-none tracking-tight">
                    ${formatUSDC(t.entryFee)}
                  </span>
                  <span className="text-[11px] text-zinc-600 font-semibold uppercase">USDC</span>
                </div>
              </div>

              {/* Players */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-zinc-500 font-medium">Players</span>
                  <span className="text-[12px] tabular-nums">
                    <span className="text-zinc-300 font-semibold">{t.registeredCount}</span>
                    <span className="text-zinc-700"> / {t.maxPlayers}</span>
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.max(fillPct, 3)}%` }} />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
                <span className="text-[11px] text-zinc-600 font-mono tabular-nums">#{t.iRacingSubsessionId}</span>
                <div className="text-[11px]">
                  <span className="text-zinc-600">Pool </span>
                  <span className="text-zinc-400 font-semibold tabular-nums">${formatUSDC(t.prizePool)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
