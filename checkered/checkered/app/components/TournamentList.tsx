"use client";

import type { Tournament } from "../types";

// Format USDC amount from 6-decimal integer string to readable dollar value
function formatUSDC(amount: string) {
  return (Number(amount) / 1_000_000).toFixed(2);
}

// Status badge colors — pill style with translucent backgrounds
const STATUS_COLORS: Record<string, string> = {
  Created: "bg-green-600/20 text-green-400",
  RegistrationClosed: "bg-yellow-600/20 text-yellow-400",
  Racing: "bg-blue-600/20 text-blue-400",
  ResultsSubmitted: "bg-purple-600/20 text-purple-400",
  Completed: "bg-zinc-600/20 text-zinc-400",
  Cancelled: "bg-red-600/20 text-red-400",
};

interface Props {
  tournaments: Tournament[];
  loading: boolean;
  onSelect: (id: number) => void;
}

export default function TournamentList({
  tournaments,
  loading,
  onSelect,
}: Props) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
        Tournaments ({tournaments.length})
      </h2>

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : tournaments.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
          No tournaments yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tournaments.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-left hover:border-zinc-600 transition-colors cursor-pointer"
            >
              {/* Top row: name + status pill */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-zinc-100 truncate mr-2">
                  {t.name}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[t.statusName] || "bg-zinc-700 text-zinc-300"}`}
                >
                  {t.statusName}
                </span>
              </div>

              {/* Middle: entry fee + players */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Entry Fee</div>
                  <div className="text-sm text-zinc-200">
                    ${formatUSDC(t.entryFee)} USDC
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Players</div>
                  <div className="text-sm text-zinc-200 mb-1">
                    {t.registeredCount}/{t.maxPlayers}
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{
                        width: `${t.maxPlayers > 0 ? (t.registeredCount / t.maxPlayers) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Prize pool */}
              <div className="mb-4">
                <div className="text-xs text-zinc-500 mb-1">Prize Pool</div>
                <div className="text-sm text-zinc-200">
                  ${formatUSDC(t.prizePool)} USDC
                </div>
              </div>

              {/* Bottom: subsession + ID */}
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>Subsession: {t.iRacingSubsessionId}</span>
                <span>#{t.id}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
