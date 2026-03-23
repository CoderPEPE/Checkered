"use client";
import { ReactNode } from "react";
import { baseSepolia } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "./theme";
import "@coinbase/onchainkit/styles.css";

export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={baseSepolia}
      config={{
        appearance: {
          mode: "dark",
        },
        wallet: {
          display: "modal",
          // "all" enables Smart Wallet + EOA (MetaMask, Rabby, etc.)
          preference: "all",
        },
        // Paymaster for gasless player transactions (uses CDP API key)
        paymaster: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY
          ? `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}`
          : undefined,
      }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </OnchainKitProvider>
  );
}
