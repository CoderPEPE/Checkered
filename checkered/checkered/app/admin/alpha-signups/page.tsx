"use client";

import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import LockIcon from "@mui/icons-material/Lock";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

interface Signup {
  id: string;
  name: string;
  iracingName: string;
  iracingCustomerId: number;
  irating: number;
  email: string;
  discord: string;
  availability: string;
  walletExperience: string;
  timestamp: string;
}

const PASSWORD_KEY = "alpha_admin_pw";

function FlagAccent() {
  return (
    <Box
      component="svg"
      viewBox="0 0 16 16"
      sx={{ width: 28, height: 28 }}
      fill="none"
      aria-hidden
    >
      <rect x="0" y="0" width="4" height="4" fill="currentColor" opacity="0.9" />
      <rect x="8" y="0" width="4" height="4" fill="currentColor" opacity="0.9" />
      <rect x="4" y="4" width="4" height="4" fill="currentColor" opacity="0.9" />
      <rect x="12" y="4" width="4" height="4" fill="currentColor" opacity="0.9" />
      <rect x="0" y="8" width="4" height="4" fill="currentColor" opacity="0.5" />
      <rect x="8" y="8" width="4" height="4" fill="currentColor" opacity="0.5" />
      <rect x="4" y="12" width="4" height="4" fill="currentColor" opacity="0.5" />
      <rect x="12" y="12" width="4" height="4" fill="currentColor" opacity="0.5" />
    </Box>
  );
}

export default function AlphaSignupsAdmin() {
  const [password, setPassword] = useState("");
  const [savedPw, setSavedPw] = useState<string | null>(null);
  const [pwError, setPwError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ count: number; signups: Signup[] } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(PASSWORD_KEY);
    if (stored) {
      setSavedPw(stored);
    }
  }, []);

  const fetchSignups = useCallback(async (pw: string) => {
    setLoading(true);
    setFetchError(null);
    setPwError(false);
    try {
      const res = await fetch("/api/alpha-signups", {
        headers: { "X-API-Key": pw },
      });
      if (res.status === 401 || res.status === 403) {
        setPwError(true);
        sessionStorage.removeItem(PASSWORD_KEY);
        setSavedPw(null);
        return;
      }
      if (!res.ok) {
        setFetchError(`Server error: ${res.status}`);
        return;
      }
      const json = await res.json();
      setData(json);
      sessionStorage.setItem(PASSWORD_KEY, pw);
      setSavedPw(pw);
    } catch {
      setFetchError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (savedPw) {
      fetchSignups(savedPw);
    }
  }, [savedPw, fetchSignups]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    fetchSignups(password);
  }

  function handleLogout() {
    sessionStorage.removeItem(PASSWORD_KEY);
    setSavedPw(null);
    setData(null);
    setPassword("");
    setPwError(false);
  }

  function exportCsv() {
    if (!data) return;
    const rows = data.signups.map((s) => [
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.iracingName.replace(/"/g, '""')}"`,
      s.iracingCustomerId,
      s.irating,
      `"${s.email.replace(/"/g, '""')}"`,
      `"${s.discord.replace(/"/g, '""')}"`,
      s.availability,
      `"${s.walletExperience.replace(/"/g, '""')}"`,
      s.timestamp,
    ]);
    const csv = [
      "Name,iRacing Name,iRacing ID,iRating,Email,Discord,Availability,Wallet Experience,Timestamp",
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alpha-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    if (!data) return;
    const json = JSON.stringify(data.signups, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alpha-signups-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const availabilityLabel: Record<string, string> = {
    tuesday: "Tuesday",
    thursday: "Thursday",
    both: "Both",
  };

  if (!savedPw) {
    return (
      <Container maxWidth="xs" sx={{ py: { xs: 8, sm: 12 } }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <LockIcon sx={{ fontSize: 48, color: "primary.light", opacity: 0.6 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Admin Access
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Enter the admin password to view alpha signups.
          </Typography>
          <Box component="form" onSubmit={handleLogin} sx={{ width: "100%" }}>
            <Stack spacing={2}>
              <TextField
                label="Password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPwError(false); }}
                error={pwError}
                helperText={pwError ? "Wrong password" : " "}
                fullWidth
                autoFocus
                slotProps={{
                  input: {
                    endAdornment: (
                      <IconButton onClick={() => setShowPw(!showPw)} edge="end" size="small">
                        {showPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    ),
                  },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={!password || loading}
                sx={{
                  py: 1.25,
                  background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                  "&:hover": { background: "linear-gradient(135deg, #818cf8, #8b5cf6)" },
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : "Unlock"}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (fetchError) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 6, sm: 10 } }}>
        <Alert severity="error" sx={{ mb: 3 }}>{fetchError}</Alert>
        <Button variant="outlined" onClick={() => fetchSignups(savedPw)}>Retry</Button>
      </Container>
    );
  }

  if (!data) return null;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <FlagAccent />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #818cf8, #c084fc)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Alpha Signups
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3, mt: 1 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {data.count} signup{data.count !== 1 ? "s" : ""}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Export CSV" arrow>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportCsv}
              sx={{ borderColor: "rgba(255,255,255,0.12)", color: "#a1a1aa", fontSize: "0.75rem" }}
            >
              CSV
            </Button>
          </Tooltip>
          <Tooltip title="Export JSON" arrow>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportJson}
              sx={{ borderColor: "rgba(255,255,255,0.12)", color: "#a1a1aa", fontSize: "0.75rem" }}
            >
              JSON
            </Button>
          </Tooltip>
          <Tooltip title="Refresh" arrow>
            <IconButton size="small" onClick={() => fetchSignups(savedPw)} sx={{ color: "#a1a1aa" }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            variant="text"
            onClick={handleLogout}
            sx={{ color: "error.light", minWidth: 0 }}
          >
            Lock
          </Button>
        </Stack>
      </Stack>

      {data.signups.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>No signups yet.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: "background.paper" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>iRacing</TableCell>
                <TableCell align="right">iRating</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Discord</TableCell>
                <TableCell>Availability</TableCell>
                <TableCell>Wallet Exp.</TableCell>
                <TableCell>Signed Up</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.signups.map((s, i) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ color: "text.secondary" }}>{data.count - i}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="body2">{s.iracingName}</Typography>
                      <Chip
                        label={`ID: ${s.iracingCustomerId}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.65rem", color: "text.secondary", borderColor: "rgba(255,255,255,0.08)" }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{s.irating.toLocaleString()}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: "var(--font-source-code-pro)", fontSize: "0.8rem" }}>
                      {s.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: s.discord ? "inherit" : "text.disabled" }}>
                      {s.discord || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={availabilityLabel[s.availability] || s.availability}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ height: 22, fontSize: "0.7rem", borderColor: "rgba(99,102,241,0.3)" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={s.walletExperience || "None"} arrow>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 120,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: s.walletExperience ? "inherit" : "text.disabled",
                        }}
                      >
                        {s.walletExperience || "—"}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                      {new Date(s.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
