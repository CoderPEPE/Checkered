"use client";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { Address, Avatar, Name, Identity } from "@coinbase/onchainkit/identity";

import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { baseSepolia } from "wagmi/chains";

interface Props {
  onNewTournament: () => void;
  showNewTournament: boolean;
}

export default function Header({ onNewTournament, showNewTournament }: Props) {
  const { isConnected } = useAccount();
  const { connect } = useConnect();

  // Connect with any injected browser wallet (Rabby, MetaMask, etc.)
  function connectBrowserWallet() {
    connect({ connector: injected() });
  }

  return (
    <AppBar position="sticky" sx={{ zIndex: 40 }}>
      <Toolbar
        sx={{
          maxWidth: "72rem",
          width: "100%",
          mx: "auto",
          px: { xs: 2, sm: 4 },
          height: 64,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {/* Branding */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Logo — checkered flag pattern */}
          <Box
            sx={{
              position: "relative",
              width: 36,
              height: 36,
              borderRadius: "12px",
              background: "linear-gradient(135deg, #6366f1, #9333ea)",
              p: "1px",
            }}
          >
            <Box
              sx={{
                width: "100%",
                height: "100%",
                borderRadius: "11px",
                bgcolor: "#08080c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="0" y="0" width="4" height="4" fill="white" opacity="0.9" />
                <rect x="8" y="0" width="4" height="4" fill="white" opacity="0.9" />
                <rect x="4" y="4" width="4" height="4" fill="white" opacity="0.9" />
                <rect x="12" y="4" width="4" height="4" fill="white" opacity="0.9" />
                <rect x="0" y="8" width="4" height="4" fill="white" opacity="0.5" />
                <rect x="8" y="8" width="4" height="4" fill="white" opacity="0.5" />
                <rect x="4" y="12" width="4" height="4" fill="white" opacity="0.5" />
                <rect x="12" y="12" width="4" height="4" fill="white" opacity="0.5" />
              </svg>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="body1" sx={{ fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}>
              Checkered
            </Typography>
            <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.1)", height: 16, alignSelf: "center" }} />
            <Typography
              variant="caption"
              sx={{ fontWeight: 500, color: "primary.light", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: "0.65rem" }}
            >
              Testnet
            </Typography>
          </Box>
        </Box>

        {/* Right side */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {/* New Tournament button (admin only) */}
          {showNewTournament && (
            <Button
              onClick={onNewTournament}
              variant="contained"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              sx={{
                background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                "&:hover": { background: "linear-gradient(135deg, #818cf8, #8b5cf6)" },
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.25)",
                fontSize: "0.8rem",
                height: 36,
              }}
            >
              New Tournament
            </Button>
          )}

          {/* Rabby / Browser wallet connect button (when not connected) */}
          {!isConnected && (
            <Tooltip title="Connect Rabby, MetaMask, or other browser wallet" arrow>
              <Button
                onClick={connectBrowserWallet}
                variant="outlined"
                size="small"
                startIcon={<AccountBalanceWalletIcon sx={{ fontSize: 16 }} />}
                sx={{
                  borderColor: "rgba(255,255,255,0.12)",
                  color: "#a1a1aa",
                  "&:hover": {
                    borderColor: "primary.main",
                    color: "primary.light",
                    bgcolor: "rgba(99,102,241,0.08)",
                  },
                  fontSize: "0.8rem",
                  height: 36,
                }}
              >
                Browser Wallet
              </Button>
            </Tooltip>
          )}

          {/* OnchainKit wallet (Coinbase Smart Wallet + EOA) — use inline styles, not Tailwind */}
          <Wallet>
            <ConnectWallet>
              <Avatar style={{ height: 24, width: 24 }} />
              <Name chain={baseSepolia} />
            </ConnectWallet>
            <WalletDropdown>
              <Identity hasCopyAddressOnClick>
                <Avatar />
                <Name chain={baseSepolia} />
                <Address />
              </Identity>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
