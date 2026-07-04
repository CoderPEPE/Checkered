"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

// TODO: replace with the real Discord invite before launch.
const DISCORD_INVITE = "[DISCORD_INVITE_LINK]";
const SUPPORT_EMAIL = "lvluplabsrace@gmail.com";

type Form = {
  name: string;
  iracingName: string;
  iracingCustomerId: string;
  irating: string;
  email: string;
  discord: string;
  availability: string;
  walletExperience: string;
};

const EMPTY: Form = {
  name: "",
  iracingName: "",
  iracingCustomerId: "",
  irating: "",
  email: "",
  discord: "",
  availability: "",
  walletExperience: "",
};

// Little checkered-flag accent, reused from the header motif.
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

export default function AlphaPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate(): boolean {
    const next: Partial<Record<keyof Form, string>> = {};
    if (!form.name.trim()) next.name = "Required";
    if (!form.iracingName.trim()) next.iracingName = "Required";
    if (!/^\d+$/.test(form.iracingCustomerId.trim()) || Number(form.iracingCustomerId) <= 0)
      next.iracingCustomerId = "Enter your numeric customer ID";
    if (form.irating.trim() === "" || Number(form.irating) < 0 || Number(form.irating) > 15000)
      next.irating = "Enter an iRating between 0 and 15000";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Enter a valid email";
    if (!form.availability) next.availability = "Pick one";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/alpha-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          iracingCustomerId: Number(form.iracingCustomerId),
          irating: Number(form.irating),
        }),
      });
      if (res.status === 201) {
        const data = await res.json();
        setPosition(data.position ?? null);
      } else if (res.status === 409) {
        setBanner("Looks like you already signed up! Check your email or reach out on Discord.");
      } else {
        setBanner(
          `Something went wrong — email us at ${SUPPORT_EMAIL} and we'll get you in manually.`
        );
      }
    } catch {
      setBanner(
        `Something went wrong — email us at ${SUPPORT_EMAIL} and we'll get you in manually.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ─────────────────────────────────────────
  if (position !== null) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
        <Paper sx={{ p: { xs: 3, sm: 5 }, textAlign: "center" }}>
          <CheckCircleIcon sx={{ fontSize: 72, color: "success.main", mb: 2 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            You&apos;re in — spot #{position} of 20!
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 3 }}>
            We&apos;ll email you setup instructions before the alpha starts in August. Join the
            Discord for updates.
          </Typography>
          <Button
            variant="contained"
            href={DISCORD_INVITE}
            sx={{
              background: "linear-gradient(135deg, #6366f1, #7c3aed)",
              "&:hover": { background: "linear-gradient(135deg, #818cf8, #8b5cf6)" },
            }}
          >
            Join the Discord
          </Button>
        </Paper>
      </Container>
    );
  }

  // ── Form state ────────────────────────────────────────────
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1, color: "primary.light" }}>
        <FlagAccent />
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #818cf8, #c084fc)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Join the Alpha
        </Typography>
      </Stack>

      <Typography sx={{ color: "text.secondary", mb: 4 }}>
        20 spots. MX-5 Cup, 2 race nights per week starting August. Race with test credits, win
        iRacing credits. No crypto experience needed.
      </Typography>

      {banner && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {banner}
        </Alert>
      )}

      <Paper sx={{ p: { xs: 2.5, sm: 4 } }}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            <TextField
              label="Name"
              value={form.name}
              onChange={set("name")}
              error={!!errors.name}
              helperText={errors.name}
              required
              fullWidth
            />
            <TextField
              label="iRacing Display Name"
              value={form.iracingName}
              onChange={set("iracingName")}
              error={!!errors.iracingName}
              helperText={errors.iracingName}
              required
              fullWidth
            />
            <TextField
              label="iRacing Customer ID"
              type="number"
              value={form.iracingCustomerId}
              onChange={set("iracingCustomerId")}
              error={!!errors.iracingCustomerId}
              helperText={
                errors.iracingCustomerId ||
                "Find it at members.iracing.com on your profile page, or in the URL as custid=XXXXXX"
              }
              required
              fullWidth
            />
            <TextField
              label="Current iRating — Road"
              type="number"
              value={form.irating}
              onChange={set("irating")}
              error={!!errors.irating}
              helperText={errors.irating}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={set("email")}
              error={!!errors.email}
              helperText={errors.email}
              required
              fullWidth
            />
            <TextField
              label="Discord Username (optional)"
              value={form.discord}
              onChange={set("discord")}
              fullWidth
            />
            <FormControl error={!!errors.availability}>
              <FormLabel sx={{ mb: 1 }}>Which race nights can you make?</FormLabel>
              <RadioGroup row value={form.availability} onChange={set("availability")}>
                <FormControlLabel value="tuesday" control={<Radio />} label="Tuesday" />
                <FormControlLabel value="thursday" control={<Radio />} label="Thursday" />
                <FormControlLabel value="both" control={<Radio />} label="Both" />
              </RadioGroup>
              {errors.availability && (
                <Typography variant="caption" color="error">
                  {errors.availability}
                </Typography>
              )}
            </FormControl>
            <TextField
              label="Any experience with crypto wallets? (optional)"
              value={form.walletExperience}
              onChange={set("walletExperience")}
              helperText="Totally fine if not — this just helps us plan onboarding"
              multiline
              rows={2}
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{
                py: 1.25,
                background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                "&:hover": { background: "linear-gradient(135deg, #818cf8, #8b5cf6)" },
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.25)",
              }}
            >
              {submitting ? "Claiming your spot…" : "Claim My Spot"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
