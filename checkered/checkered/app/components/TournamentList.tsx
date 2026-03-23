"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import FlagIcon from "@mui/icons-material/Flag";
import type { Tournament } from "../types";

function formatUSDC(amount: string) {
  const val = Number(amount) / 1_000_000;
  return val < 1 ? val.toFixed(2) : val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
}

// Status badge config
const STATUS_CONFIG: Record<string, { color: "success" | "warning" | "info" | "secondary" | "default" | "error"; label: string }> = {
  Created: { color: "success", label: "Open" },
  RegistrationClosed: { color: "warning", label: "Closed" },
  Racing: { color: "info", label: "Live" },
  ResultsSubmitted: { color: "secondary", label: "Results" },
  Completed: { color: "default", label: "Done" },
  Cancelled: { color: "error", label: "Cancelled" },
};

interface Props {
  tournaments: Tournament[];
  loading: boolean;
  onSelect: (id: number) => void;
}

export default function TournamentList({ tournaments, loading, onSelect }: Props) {
  // Loading skeletons
  if (loading) {
    return (
      <Grid container spacing={2.5}>
        {[...Array(6)].map((_, i) => (
          <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Skeleton width={60} height={20} sx={{ mb: 2.5 }} />
                <Skeleton width="75%" height={24} sx={{ mb: 2.5 }} />
                <Skeleton width={100} height={36} sx={{ mb: 1 }} />
                <Skeleton width={50} height={16} sx={{ mb: 2.5 }} />
                <Skeleton height={4} sx={{ mb: 2.5 }} />
                <Skeleton height={16} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  // Empty state
  if (tournaments.length === 0) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 14 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 4,
            bgcolor: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2.5,
          }}
        >
          <FlagIcon sx={{ fontSize: 28, color: "text.secondary", opacity: 0.4 }} />
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          No tournaments yet
        </Typography>
        <Typography variant="caption" sx={{ color: "#3f3f46", mt: 0.5 }}>
          Create one to get started
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="section">
      {/* Section header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ color: "text.secondary", fontSize: "0.8rem", fontWeight: 600 }}>
          Tournaments
        </Typography>
        <Chip
          label={tournaments.length}
          size="small"
          sx={{
            height: 22,
            fontSize: "0.7rem",
            bgcolor: "rgba(255,255,255,0.03)",
            color: "text.secondary",
            fontVariantNumeric: "tabular-nums",
          }}
        />
      </Box>

      {/* Tournament grid */}
      <Grid container spacing={2.5}>
        {tournaments.map((t) => {
          const cfg = STATUS_CONFIG[t.statusName] || { color: "default" as const, label: t.statusName };
          const fillPct = t.maxPlayers > 0 ? (t.registeredCount / t.maxPlayers) * 100 : 0;

          return (
            <Grid key={t.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardActionArea onClick={() => onSelect(t.id)} sx={{ p: 0 }}>
                  <CardContent sx={{ p: 3 }}>
                    {/* Status row */}
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
                      <Chip
                        label={cfg.label}
                        color={cfg.color}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22, textTransform: "uppercase" }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: "#3f3f46", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}
                      >
                        #{t.id}
                      </Typography>
                    </Box>

                    {/* Tournament name */}
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        color: "#d4d4d8",
                        mb: 2.5,
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.name}
                    </Typography>

                    {/* Entry fee */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                        <Typography
                          variant="h4"
                          sx={{ fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums", lineHeight: 1, letterSpacing: "-0.02em" }}
                        >
                          ${formatUSDC(t.entryFee)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#52525b", fontWeight: 600, textTransform: "uppercase", fontSize: "0.65rem" }}>
                          USDC
                        </Typography>
                      </Box>
                    </Box>

                    {/* Players progress */}
                    <Box sx={{ mb: 2.5 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
                          Players
                        </Typography>
                        <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
                          <Box component="span" sx={{ color: "#d4d4d8", fontWeight: 600 }}>{t.registeredCount}</Box>
                          <Box component="span" sx={{ color: "#3f3f46" }}> / {t.maxPlayers}</Box>
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={Math.max(fillPct, 3)} />
                    </Box>

                    {/* Footer */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        pt: 2,
                        borderTop: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#52525b", fontVariantNumeric: "tabular-nums" }}>
                        #{t.iRacingSubsessionId}
                      </Typography>
                      <Typography variant="caption">
                        <Box component="span" sx={{ color: "#52525b" }}>Pool </Box>
                        <Box component="span" sx={{ color: "text.secondary", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          ${formatUSDC(t.prizePool)}
                        </Box>
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
