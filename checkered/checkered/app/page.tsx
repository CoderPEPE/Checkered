"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useIsAdmin } from "./hooks/useIsAdmin";
import Header from "./components/Header";
import CreateTournament from "./components/CreateTournament";
import TournamentList from "./components/TournamentList";
import TournamentDetail from "./components/TournamentDetail";
import { sanitizeError } from "./utils/sanitizeError";
import type { Tournament, TournamentDetail as TournamentDetailType } from "./types";

export default function Home() {
  const { isConnected } = useAccount();
  const { isAdmin } = useIsAdmin();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] =
    useState<TournamentDetailType | null>(null);
  const [showCreateTournament, setShowCreateTournament] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const tournamentsRes = await fetch("/api/tournaments");
      if (!tournamentsRes.ok) throw new Error("Backend not reachable — is it running on port 3001?");
      setTournaments(await tournamentsRes.json());
      setError(null);
    } catch (err) {
      setError(sanitizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function selectTournament(id: number) {
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      if (!res.ok) throw new Error(`Failed to load tournament (HTTP ${res.status})`);
      setSelectedTournament(await res.json());
    } catch (err) {
      setError(sanitizeError(err));
    }
  }

  function refreshSelectedTournament() {
    if (selectedTournament) selectTournament(selectedTournament.id);
    fetchData();
  }

  const totalPool = tournaments.reduce((sum, t) => sum + Number(t.prizePool), 0);
  const totalPlayers = tournaments.reduce((sum, t) => sum + t.registeredCount, 0);
  const activeTournaments = tournaments.filter(t => t.statusName === "Created" || t.statusName === "Racing").length;

  return (
    <div className="min-h-screen bg-[#08080c] text-zinc-100 bg-grid top-glow">
      <Header
        onNewTournament={() => setShowCreateTournament(true)}
        showNewTournament={isConnected && isAdmin}
      />

      <main className="relative z-10 max-w-6xl mx-auto px-8 pt-10 pb-20">
        {/* Stats bar */}
        {!loading && tournaments.length > 0 && (
          <div className="flex items-center justify-center gap-16 mb-10">
            {[
              { value: activeTournaments.toString(), label: "Active" },
              { value: totalPlayers.toString(), label: "Players" },
              { value: `$${(totalPool / 1_000_000).toFixed(0)}`, label: "Total Pool" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold gradient-text tabular-nums">{s.value}</div>
                <div className="text-[11px] text-zinc-600 mt-0.5 uppercase tracking-widest font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-8 bg-red-500/5 border border-red-500/10 text-red-400/90 px-5 py-3.5 rounded-xl text-sm flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <TournamentList tournaments={tournaments} loading={loading} onSelect={selectTournament} />
      </main>

      {selectedTournament && (
        <TournamentDetail
          tournament={selectedTournament}
          isAdmin={isConnected && isAdmin}
          onClose={() => setSelectedTournament(null)}
          onRefresh={refreshSelectedTournament}
        />
      )}
      <CreateTournament open={showCreateTournament} onClose={() => setShowCreateTournament(false)} onCreated={fetchData} />

      <footer className="relative z-10 border-t border-white/[0.03] px-8 py-6 text-center">
        <span className="text-[11px] text-zinc-700">Checkered — iRacing Tournaments on Base</span>
      </footer>
    </div>
  );
}
