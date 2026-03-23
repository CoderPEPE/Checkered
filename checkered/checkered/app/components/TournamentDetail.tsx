"use client";

import { useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TOURNAMENT_ADDRESS, TOURNAMENT_ABI, EXPLORER_URL } from "../contracts";
import { sanitizeError } from "../utils/sanitizeError";
import type { TournamentDetail as TournamentDetailType } from "../types";
import RegisterForTournament from "./RegisterForTournament";
import Overlay from "./Overlay";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import BlockIcon from "@mui/icons-material/Block";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CancelIcon from "@mui/icons-material/Cancel";

function formatUSDC(amount: string) {
  return (Number(amount) / 1_000_000).toFixed(2);
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// Status chip colors
const STATUS_CONFIG: Record<string, { color: "success" | "warning" | "info" | "secondary" | "default" | "error" }> = {
  Created: { color: "success" },
  RegistrationClosed: { color: "warning" },
  Racing: { color: "info" },
  ResultsSubmitted: { color: "secondary" },
  Completed: { color: "default" },
  Cancelled: { color: "error" },
};

interface Props {
  tournament: TournamentDetailType;
  isAdmin: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function TournamentDetail({ tournament, isAdmin, onClose, onRefresh }: Props) {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      const timer = setTimeout(() => onRefresh(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, onRefresh]);

  function sendAdminTx(functionName: "closeRegistration" | "startRace" | "cancelTournament") {
    if (functionName === "cancelTournament") {
      const msg = status === "Racing"
        ? "This tournament is currently RACING. Cancelling will stop the race and enable refunds. Are you sure?"
        : "Cancel this tournament? Registered players will be able to claim refunds.";
      if (!window.confirm(msg)) return;
    }
    reset();
    writeContract({ address: TOURNAMENT_ADDRESS, abi: TOURNAMENT_ABI, functionName, args: [BigInt(tournament.id)] });
  }

  const status = tournament.statusName;
  const cfg = STATUS_CONFIG[status] || { color: "default" as const };
  const alreadyRegistered = address ? tournament.players.some((p) => p.wallet.toLowerCase() === address.toLowerCase()) : false;
  const fillPct = tournament.maxPlayers > 0 ? (tournament.registeredCount / tournament.maxPlayers) * 100 : 0;

  return (
    <Overlay open={true} onClose={onClose} title={tournament.name}>
      <Stack spacing={3}>
        {/* Status chip */}
        <Chip
          label={status}
          color={cfg.color}
          size="small"
          variant="outlined"
          sx={{ alignSelf: "flex-start", textTransform: "uppercase" }}
        />

        {/* Stats grid */}
        <Grid container spacing={1.5}>
          {/* Entry Fee */}
          <Grid size={4}>
            <Paper sx={{ p: 2, bgcolor: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Typography variant="overline" sx={{ color: "#71717a", fontSize: "0.6rem", letterSpacing: "0.1em", display: "block", mb: 1 }}>
                Entry Fee
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "white", lineHeight: 1, mb: 0.5, fontVariantNumeric: "tabular-nums" }}>
                ${formatUSDC(tournament.entryFee)}
              </Typography>
              <Typography variant="caption" sx={{ color: "#52525b", fontWeight: 500, fontSize: "0.6rem" }}>
                USDC
              </Typography>
            </Paper>
          </Grid>

          {/* Players */}
          <Grid size={4}>
            <Paper sx={{ p: 2, bgcolor: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Typography variant="overline" sx={{ color: "#71717a", fontSize: "0.6rem", letterSpacing: "0.1em", display: "block", mb: 1 }}>
                Players
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "white", lineHeight: 1, mb: 1.5, fontVariantNumeric: "tabular-nums" }}>
                {tournament.registeredCount}
                <Typography component="span" sx={{ fontSize: "0.875rem", color: "#3f3f46", ml: 0.25 }}>
                  / {tournament.maxPlayers}
                </Typography>
              </Typography>
              <LinearProgress variant="determinate" value={Math.max(fillPct, 3)} />
            </Paper>
          </Grid>

          {/* Prize Pool */}
          <Grid size={4}>
            <Paper sx={{ p: 2, bgcolor: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Typography variant="overline" sx={{ color: "#71717a", fontSize: "0.6rem", letterSpacing: "0.1em", display: "block", mb: 1 }}>
                Prize Pool
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "white", lineHeight: 1, mb: 0.5, fontVariantNumeric: "tabular-nums" }}>
                ${formatUSDC(tournament.prizePool)}
              </Typography>
              <Typography variant="caption" sx={{ color: "#52525b", fontWeight: 500, fontSize: "0.6rem" }}>
                USDC
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Info row */}
        <Grid container spacing={1.5}>
          {[
            { label: "Prize Split", value: tournament.prizeSplits.map((s) => s / 100 + "%").join(" / ") },
            { label: "Subsession", value: `#${tournament.iRacingSubsessionId}` },
            { label: "Created", value: formatDate(tournament.createdAt) },
          ].map((item) => (
            <Grid key={item.label} size={4}>
              <Paper sx={{ p: 1.5, bgcolor: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
                <Typography variant="overline" sx={{ color: "#52525b", fontSize: "0.6rem", display: "block", mb: 0.5 }}>
                  {item.label}
                </Typography>
                <Typography variant="body2" sx={{ color: "#d4d4d8", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                  {item.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Winners (completed tournaments) */}
        {status === "Completed" && tournament.winners && tournament.winners.length > 0 && (
          <Box>
            <Typography variant="overline" sx={{ color: "#71717a", letterSpacing: "0.1em", display: "block", mb: 1.5, fontWeight: 600 }}>
              Winners
            </Typography>
            <Stack spacing={1}>
              {tournament.winners.map((w) => {
                const posColors = {
                  1: { bg: "rgba(234,179,8,0.04)", border: "rgba(234,179,8,0.12)", badge: "linear-gradient(135deg, rgba(234,179,8,0.3), rgba(245,158,11,0.3))", text: "#fbbf24" },
                  2: { bg: "rgba(148,163,184,0.04)", border: "rgba(148,163,184,0.12)", badge: "linear-gradient(135deg, rgba(148,163,184,0.3), rgba(203,213,225,0.3))", text: "#cbd5e1" },
                  3: { bg: "rgba(180,83,9,0.04)", border: "rgba(180,83,9,0.12)", badge: "linear-gradient(135deg, rgba(180,83,9,0.3), rgba(217,119,6,0.3))", text: "#d97706" },
                };
                const c = posColors[w.position as 1 | 2 | 3] || posColors[3];
                return (
                  <Paper
                    key={w.wallet}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: "12px 16px",
                      bgcolor: c.bg,
                      border: `1px solid ${c.border}`,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 24, height: 24, borderRadius: "50%",
                          background: c.badge, border: `1px solid ${c.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}
                      >
                        <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: c.text }}>
                          {w.position === 1 ? "1st" : w.position === 2 ? "2nd" : `${w.position}${w.position === 3 ? "rd" : "th"}`}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: "var(--font-source-code-pro), monospace", color: "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {w.wallet}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "success.main", fontVariantNumeric: "tabular-nums", ml: 1.5, flexShrink: 0 }}>
                      ${formatUSDC(w.amount)}
                    </Typography>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Registration */}
        {status === "Created" && isConnected && address && !alreadyRegistered && (
          <RegisterForTournament tournamentId={tournament.id} entryFee={tournament.entryFee} onRegistered={onRefresh} />
        )}

        {/* Refund claim for cancelled tournaments */}
        {status === "Cancelled" && isConnected && address && alreadyRegistered && (() => {
          const playerReg = tournament.players.find((p) => p.wallet.toLowerCase() === address.toLowerCase());
          const hasClaimed = playerReg?.refundClaimed;
          return (
            <Alert
              severity="error"
              variant="outlined"
              icon={<CancelIcon />}
              sx={{ bgcolor: "rgba(239,68,68,0.04)" }}
            >
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                Tournament Cancelled
              </Typography>
              {hasClaimed ? (
                <Typography variant="caption" color="text.secondary">Refund already claimed</Typography>
              ) : (
                <>
                  <Typography variant="caption" sx={{ color: "#a1a1aa", display: "block", mb: 1.5 }}>
                    You can claim your ${formatUSDC(tournament.entryFee)} USDC entry fee back.
                  </Typography>
                  <Button
                    onClick={() => {
                      reset();
                      writeContract({
                        address: TOURNAMENT_ADDRESS,
                        abi: TOURNAMENT_ABI,
                        functionName: "claimRefund",
                        args: [BigInt(tournament.id)],
                      });
                    }}
                    disabled={isPending || isConfirming}
                    variant="outlined"
                    color="success"
                    size="small"
                    sx={{ fontSize: "0.75rem" }}
                  >
                    Claim Refund — ${formatUSDC(tournament.entryFee)} USDC
                  </Button>
                </>
              )}
            </Alert>
          );
        })()}

        {/* Players list */}
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
            <Typography variant="overline" sx={{ color: "#71717a", letterSpacing: "0.1em", fontWeight: 600 }}>
              Players
            </Typography>
            <Typography variant="caption" sx={{ color: "#3f3f46", fontVariantNumeric: "tabular-nums" }}>
              {tournament.players.length} registered
            </Typography>
          </Box>

          {tournament.players.length === 0 ? (
            <Paper sx={{ textAlign: "center", p: "40px 20px", bgcolor: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <Typography variant="body2" sx={{ color: "#52525b" }}>No players registered yet</Typography>
              <Typography variant="caption" sx={{ color: "#3f3f46", mt: 0.5, display: "block" }}>Be the first to join!</Typography>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {tournament.players.map((p, i) => (
                <Paper
                  key={p.wallet}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: "12px 16px",
                    bgcolor: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))",
                        border: "1px solid rgba(99,102,241,0.1)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}
                    >
                      <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: "#818cf8", fontVariantNumeric: "tabular-nums" }}>
                        {i + 1}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: "var(--font-source-code-pro), monospace", color: "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {p.wallet}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: "var(--font-source-code-pro), monospace", color: "#52525b", fontVariantNumeric: "tabular-nums", ml: 1.5, flexShrink: 0 }}
                  >
                    iR #{p.iRacingCustomerId}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        {/* Admin actions */}
        {isAdmin && (status === "Created" || status === "RegistrationClosed" || status === "Racing") && (
          <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.04)", pt: 2.5 }}>
            <Typography variant="overline" sx={{ color: "#52525b", letterSpacing: "0.1em", display: "block", mb: 1.5, fontWeight: 600 }}>
              Admin Actions
            </Typography>
            <Stack direction="row" spacing={1}>
              {status === "Created" && (
                <Button
                  onClick={() => sendAdminTx("closeRegistration")}
                  disabled={isPending || isConfirming}
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<BlockIcon sx={{ fontSize: 14 }} />}
                  sx={{ fontSize: "0.75rem" }}
                >
                  Close Registration
                </Button>
              )}
              {status === "RegistrationClosed" && (
                <Button
                  onClick={() => sendAdminTx("startRace")}
                  disabled={isPending || isConfirming}
                  variant="outlined"
                  color="info"
                  size="small"
                  startIcon={<PlayArrowIcon sx={{ fontSize: 14 }} />}
                  sx={{ fontSize: "0.75rem" }}
                >
                  Start Race
                </Button>
              )}
              <Button
                onClick={() => sendAdminTx("cancelTournament")}
                disabled={isPending || isConfirming}
                variant="outlined"
                color="error"
                size="small"
                startIcon={<CancelIcon sx={{ fontSize: 14 }} />}
                sx={{ fontSize: "0.75rem" }}
              >
                Cancel Tournament
              </Button>
            </Stack>

            {/* Transaction status */}
            {isPending && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
                <CircularProgress size={14} color="warning" />
                <Typography variant="caption" color="warning.main">Waiting for wallet...</Typography>
              </Box>
            )}
            {isConfirming && txHash && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
                <CircularProgress size={14} color="warning" />
                <Link href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" underline="always" variant="caption" color="warning.main">
                  Confirming...
                </Link>
              </Box>
            )}
            {isConfirmed && txHash && (
              <Typography variant="caption" color="success.main" fontWeight={500} sx={{ mt: 1.5, display: "block" }}>
                Confirmed!{" "}
                <Link href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" underline="always" color="inherit">
                  View tx
                </Link>
              </Typography>
            )}
            {error && (
              <Alert severity="error" variant="outlined" sx={{ mt: 1.5, py: 0.5 }}>
                <Typography variant="caption">{sanitizeError(error)}</Typography>
              </Alert>
            )}
          </Box>
        )}
      </Stack>
    </Overlay>
  );
}
