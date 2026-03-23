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

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

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
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }} className="bg-grid top-glow">
      <Header
        onNewTournament={() => setShowCreateTournament(true)}
        showNewTournament={isConnected && isAdmin}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 10, pt: 5, pb: 10 }}>
        {/* Stats bar */}
        {!loading && tournaments.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", gap: 8, mb: 5 }}>
            {[
              { value: activeTournaments.toString(), label: "Active" },
              { value: totalPlayers.toString(), label: "Players" },
              { value: `$${(totalPool / 1_000_000).toFixed(0)}`, label: "Total Pool" },
            ].map((s) => (
              <Box key={s.label} sx={{ textAlign: "center" }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.2,
                    background: "linear-gradient(135deg, #818cf8, #c084fc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {s.value}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#52525b",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: 500,
                    fontSize: "0.6rem",
                    mt: 0.5,
                    display: "block",
                  }}
                >
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Error message */}
        {error && (
          <Alert
            severity="error"
            variant="outlined"
            icon={<ErrorOutlineIcon fontSize="small" />}
            sx={{ mb: 4, bgcolor: "rgba(239,68,68,0.04)" }}
          >
            {error}
          </Alert>
        )}

        <TournamentList tournaments={tournaments} loading={loading} onSelect={selectTournament} />
      </Container>

      {selectedTournament && (
        <TournamentDetail
          tournament={selectedTournament}
          isAdmin={isConnected && isAdmin}
          onClose={() => setSelectedTournament(null)}
          onRefresh={refreshSelectedTournament}
        />
      )}
      <CreateTournament open={showCreateTournament} onClose={() => setShowCreateTournament(false)} onCreated={fetchData} />

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          position: "relative",
          zIndex: 10,
          borderTop: "1px solid rgba(255,255,255,0.03)",
          px: 4,
          py: 3,
          textAlign: "center",
        }}
      >
        <Typography variant="caption" sx={{ color: "#3f3f46", fontSize: "0.65rem" }}>
          Checkered — iRacing Tournaments on Base
        </Typography>
      </Box>
    </Box>
  );
}
