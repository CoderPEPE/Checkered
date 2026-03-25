"use client";

import { useState, useEffect } from "react";
import { parseUnits } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TOURNAMENT_ADDRESS, TOURNAMENT_ABI, EXPLORER_URL } from "../contracts";
import { sanitizeError } from "../utils/sanitizeError";
import Overlay from "./Overlay";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";

const SPLIT_PRESETS = [
  { label: "Winner Take All", desc: "100%", splits: [10000n] },
  { label: "Top 2", desc: "70 / 30", splits: [7000n, 3000n] },
  { label: "Top 3", desc: "60 / 30 / 10", splits: [6000n, 3000n, 1000n] },
  { label: "Top 3 Even", desc: "50 / 30 / 20", splits: [5000n, 3000n, 2000n] },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTournament({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [entryFee, setEntryFee] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [splitIndex, setSplitIndex] = useState(2);
  const [subsessionId, setSubsessionId] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [seasonId, setSeasonId] = useState("");

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      setName(""); setEntryFee(""); setMaxPlayers(""); setSubsessionId(""); setLeagueId(""); setSeasonId("");
      const timer = setTimeout(() => { onCreated(); onClose(); }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, onCreated, onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset();
    const feeInUnits = parseUnits(entryFee, 6);
    const splits = SPLIT_PRESETS[splitIndex].splits;
    writeContract({
      address: TOURNAMENT_ADDRESS,
      abi: TOURNAMENT_ABI,
      functionName: "createTournament",
      args: [
        name,
        feeInUnits,
        BigInt(maxPlayers),
        splits,
        BigInt(subsessionId || "0"),
        BigInt(leagueId || "0"),
        BigInt(seasonId || "0"),
      ],
    });
  }

  const hasLeague = leagueId && seasonId;
  const isValid = name && entryFee && maxPlayers && (subsessionId || hasLeague);

  return (
    <Overlay open={open} onClose={onClose} title="New Tournament">
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Tournament name */}
        <TextField
          label="Tournament Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Friday Night Thunder"
          fullWidth
        />

        {/* Entry Fee, Max Players, Subsession ID */}
        <Grid container spacing={1.5}>
          <Grid size={4}>
            <TextField
              label="Entry Fee"
              type="number"
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              required
              slotProps={{
                htmlInput: { min: 0, step: "0.01" },
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                },
              }}
              placeholder="10"
              fullWidth
            />
          </Grid>
          <Grid size={4}>
            <TextField
              label="Max Players"
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              required
              slotProps={{ htmlInput: { min: 2, max: 64 } }}
              placeholder="20"
              fullWidth
            />
          </Grid>
          <Grid size={4}>
            <TextField
              label="Subsession"
              type="number"
              value={subsessionId}
              onChange={(e) => setSubsessionId(e.target.value)}
              required={!hasLeague}
              slotProps={{ htmlInput: { min: 0 } }}
              placeholder={hasLeague ? "Auto" : "12345"}
              disabled={!!hasLeague}
              fullWidth
              helperText={hasLeague ? "Auto-discovered" : ""}
            />
          </Grid>
        </Grid>

        {/* League Integration (optional) */}
        <Grid container spacing={1.5}>
          <Grid size={6}>
            <TextField
              label="League ID"
              type="number"
              value={leagueId}
              onChange={(e) => {
                setLeagueId(e.target.value);
                if (e.target.value) setSubsessionId("");
              }}
              slotProps={{ htmlInput: { min: 1 } }}
              placeholder="Optional"
              fullWidth
              helperText="iRacing league for auto-discovery"
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Season ID"
              type="number"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              slotProps={{ htmlInput: { min: 1 } }}
              placeholder="Optional"
              fullWidth
              required={!!leagueId}
              helperText={leagueId ? "Required with league" : ""}
            />
          </Grid>
        </Grid>

        {/* Prize Split presets */}
        <Box>
          <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.1em", display: "block", mb: 1, fontWeight: 500 }}>
            Prize Split
          </Typography>
          <Grid container spacing={1}>
            {SPLIT_PRESETS.map((preset, i) => (
              <Grid key={i} size={6}>
                <Button
                  onClick={() => setSplitIndex(i)}
                  variant={splitIndex === i ? "outlined" : "text"}
                  fullWidth
                  sx={{
                    justifyContent: "flex-start",
                    px: 2,
                    py: 1.2,
                    borderRadius: "12px",
                    textAlign: "left",
                    border: splitIndex === i
                      ? "1px solid rgba(99,102,241,0.3)"
                      : "1px solid rgba(63,63,70,0.3)",
                    bgcolor: splitIndex === i
                      ? "rgba(99,102,241,0.08)"
                      : "rgba(24,24,27,0.4)",
                    color: splitIndex === i ? "primary.light" : "text.secondary",
                    "&:hover": {
                      bgcolor: splitIndex === i
                        ? "rgba(99,102,241,0.12)"
                        : "rgba(63,63,70,0.2)",
                      borderColor: splitIndex === i
                        ? "rgba(99,102,241,0.4)"
                        : "rgba(63,63,70,0.5)",
                    },
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 500, lineHeight: 1.2, fontSize: "0.75rem" }}>
                    {preset.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.6rem",
                      color: splitIndex === i ? "rgba(129,140,248,0.6)" : "#3f3f46",
                    }}
                  >
                    {preset.desc}
                  </Typography>
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Submit button */}
        <Button
          type="submit"
          disabled={!isValid || isPending || isConfirming}
          variant="contained"
          fullWidth
          sx={{
            py: 1.5,
            background: "linear-gradient(135deg, #6366f1, #9333ea)",
            "&:hover": { background: "linear-gradient(135deg, #818cf8, #a855f7)" },
            "&:disabled": { opacity: 0.3 },
            boxShadow: "0 4px 14px rgba(99,102,241,0.2)",
            fontSize: "0.875rem",
          }}
        >
          {isPending ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} color="inherit" />
              Waiting for wallet...
            </Box>
          ) : isConfirming ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} color="inherit" />
              Confirming...
            </Box>
          ) : (
            "Create Tournament"
          )}
        </Button>

        {/* Status messages */}
        {isConfirming && txHash && (
          <Box sx={{ textAlign: "center" }}>
            <Link
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              underline="always"
              variant="caption"
              color="warning.main"
            >
              View on BaseScan
            </Link>
          </Box>
        )}
        {isConfirmed && (
          <Alert severity="success" variant="outlined" sx={{ justifyContent: "center" }}>
            <Typography variant="body2" fontWeight={500}>Tournament created!</Typography>
          </Alert>
        )}
        {error && (
          <Alert severity="error" variant="outlined">
            <Typography variant="caption">{sanitizeError(error)}</Typography>
          </Alert>
        )}
      </Box>
    </Overlay>
  );
}
