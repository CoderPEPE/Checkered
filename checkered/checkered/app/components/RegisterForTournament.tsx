"use client";

import { useState } from "react";
import {
  Transaction,
  TransactionButton,
  TransactionSponsor,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from "@coinbase/onchainkit/transaction";
import type { LifecycleStatus } from "@coinbase/onchainkit/transaction";
import { baseSepolia } from "wagmi/chains";
import { useAccount, useReadContract } from "wagmi";
import { buildRegisterCalls } from "../calls";
import { USDC_ADDRESS, CHEX_ADDRESS, ERC20_ABI } from "../contracts";
import type { Hex } from "viem";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Chip from "@mui/material/Chip";

interface Props {
  tournamentId: number;
  entryFee: string;
  tokenSymbol: "USDC" | "CHEX";
  tokenDecimals: number;
  paymentToken: string;
  onRegistered: () => void;
}

export default function RegisterForTournament({ tournamentId, entryFee, tokenSymbol, tokenDecimals, paymentToken, onRegistered }: Props) {
  const [iRacingId, setIRacingId] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const { address } = useAccount();

  // Read the user's token balance (USDC or CHEX depending on tournament)
  const tokenAddress = paymentToken as Hex;
  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const entryFeeBigInt = BigInt(entryFee);
  const iRacingIdNum = Number(iRacingId);
  const isValid = iRacingId.length > 0 && Number.isInteger(iRacingIdNum) && iRacingIdNum > 0;

  // Check if balance is sufficient
  const balanceNum = tokenBalance !== undefined ? Number(tokenBalance) : null;
  const entryFeeNum = Number(entryFee);
  const hasEnoughBalance = balanceNum !== null && balanceNum >= entryFeeNum;
  const divisor = 10 ** tokenDecimals;
  const balanceFormatted = balanceNum !== null ? (balanceNum / divisor).toFixed(2) : "...";
  const entryFeeFormatted = (entryFeeNum / divisor).toFixed(2);

  function handleStatus(status: LifecycleStatus) {
    if (status.statusName === "success") {
      setIRacingId("");
      setTimeout(() => onRegistered(), 2000);
    }
    if (status.statusName === "error") {
      // Show toast for any transaction error
      setToastMsg(`Transaction failed. Check your ${tokenSymbol} balance and try again.`);
      setToastOpen(true);
    }
  }

  // Intercept registration if balance is too low
  function handleRegisterClick() {
    if (!hasEnoughBalance) {
      setToastMsg(
        `Insufficient ${tokenSymbol} balance. You have ${balanceFormatted} but need ${entryFeeFormatted} to register.`
      );
      setToastOpen(true);
    }
  }

  return (
    <Box sx={{ pt: 2 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.1em", display: "block", mb: 1.5, fontWeight: 500 }}>
        Register for Tournament
      </Typography>

      {/* Token Balance display */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Your {tokenSymbol} Balance:
        </Typography>
        <Chip
          label={`$${balanceFormatted}`}
          size="small"
          color={hasEnoughBalance ? "success" : "error"}
          variant="outlined"
          sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
        />
        {!hasEnoughBalance && balanceNum !== null && (
          <Typography variant="caption" color="error.main" sx={{ fontWeight: 500 }}>
            Need ${entryFeeFormatted}
          </Typography>
        )}
      </Box>

      {/* Insufficient balance warning */}
      {!hasEnoughBalance && balanceNum !== null && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2, bgcolor: "rgba(245,158,11,0.04)" }}>
          <Typography variant="caption">
            You need {entryFeeFormatted} {tokenSymbol} to register. Your balance is {balanceFormatted} {tokenSymbol}.
          </Typography>
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <TextField
          label="iRacing Customer ID"
          type="number"
          value={iRacingId}
          onChange={(e) => setIRacingId(e.target.value)}
          slotProps={{ htmlInput: { min: 1 } }}
          placeholder="123456"
          sx={{ maxWidth: 280 }}
        />
      </Box>

      {/* OnchainKit Transaction — only show if balance is sufficient */}
      {isValid && hasEnoughBalance && (
        <Box
          sx={{
            "& button": {
              background: "linear-gradient(135deg, #6366f1, #9333ea) !important",
              color: "#fff !important",
              fontWeight: 600,
              fontSize: "0.875rem",
              padding: "10px 24px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              width: "100%",
              transition: "opacity 0.2s",
              boxShadow: "0 4px 14px rgba(99,102,241,0.2)",
              "&:hover": {
                opacity: 0.9,
              },
            },
            "& [data-testid]": {
              fontSize: "0.875rem",
              marginTop: "8px",
            },
          }}
        >
          <Transaction
            chainId={baseSepolia.id}
            calls={buildRegisterCalls(tournamentId, iRacingIdNum, entryFeeBigInt, tokenAddress)}
            isSponsored
            onStatus={handleStatus}
          >
            <TransactionButton
              text={`Register — ${entryFeeFormatted} ${tokenSymbol}`}
            />
            <TransactionSponsor />
            <TransactionStatus>
              <TransactionStatusLabel />
              <TransactionStatusAction />
            </TransactionStatus>
          </Transaction>
        </Box>
      )}

      {/* Disabled button when balance is insufficient but form is valid */}
      {isValid && !hasEnoughBalance && balanceNum !== null && (
        <Box
          onClick={handleRegisterClick}
          sx={{
            background: "rgba(99,102,241,0.15)",
            color: "rgba(255,255,255,0.4)",
            fontWeight: 600,
            fontSize: "0.875rem",
            padding: "10px 24px",
            borderRadius: "12px",
            textAlign: "center",
            cursor: "not-allowed",
            userSelect: "none",
          }}
        >
          Insufficient {tokenSymbol} — {balanceFormatted} / {entryFeeFormatted} needed
        </Box>
      )}

      {/* Toast notification */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={5000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToastOpen(false)}
          severity="error"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toastMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
