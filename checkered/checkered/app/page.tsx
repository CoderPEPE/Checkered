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

  // Data state
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] =
    useState<TournamentDetailType | null>(null);

  // UI state
  const [showCreateTournament, setShowCreateTournament] = useState(false);

  // Fetch tournaments from the backend API
  const fetchData = useCallback(async () => {
    try {
      const tournamentsRes = await fetch("/api/tournaments");

      if (!tournamentsRes.ok) {
        throw new Error("Backend not reachable — is it running on port 3001?");
      }

      setTournaments(await tournamentsRes.json());
      setError(null);
    } catch (err) {
      setError(sanitizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount + auto-refresh every 15 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch single tournament details when user clicks a card
  async function selectTournament(id: number) {
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      const data = await res.json();
      setSelectedTournament(data);
    } catch (err) {
      setError(sanitizeError(err));
    }
  }

  // Re-select current tournament to refresh its data (used after actions)
  function refreshSelectedTournament() {
    if (selectedTournament) {
      selectTournament(selectedTournament.id);
    }
    fetchData();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header
        onNewTournament={() => setShowCreateTournament(true)}
        showNewTournament={isConnected && isAdmin}
      />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Error banner */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Tournament card grid */}
        <TournamentList
          tournaments={tournaments}
          loading={loading}
          onSelect={selectTournament}
        />
      </main>

      {/* Tournament detail overlay */}
      {selectedTournament && (
        <TournamentDetail
          tournament={selectedTournament}
          isAdmin={isConnected && isAdmin}
          onClose={() => setSelectedTournament(null)}
          onRefresh={refreshSelectedTournament}
        />
      )}

      {/* Create tournament overlay */}
      <CreateTournament
        open={showCreateTournament}
        onClose={() => setShowCreateTournament(false)}
        onCreated={fetchData}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4 text-center text-xs text-zinc-600">
        Checkered — iRacing Tournaments on Base | Sepolia Testnet
      </footer>
    </div>
  );
}
