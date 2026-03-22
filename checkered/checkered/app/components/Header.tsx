"use client";

import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownFundLink,
} from "@coinbase/onchainkit/wallet";
import { Address, Avatar, Name, Identity } from "@coinbase/onchainkit/identity";
import { FundButton } from "@coinbase/onchainkit/fund";
import { useAccount } from "wagmi";
import { baseSepolia } from "wagmi/chains";

interface Props {
  onNewTournament: () => void;
  showNewTournament: boolean;
}

export default function Header({ onNewTournament, showNewTournament }: Props) {
  const { isConnected } = useAccount();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#08080c]/70 border-b border-white/[0.04]">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-8 h-16">
        {/* Branding */}
        <div className="flex items-center gap-4">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px]">
            <div className="w-full h-full rounded-xl bg-[#08080c] flex items-center justify-center">
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
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[17px] font-bold text-white tracking-tight">Checkered</span>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[11px] font-medium text-indigo-400/70 uppercase tracking-widest">Testnet</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {showNewTournament && (
            <button
              onClick={onNewTournament}
              className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-[13px] font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Tournament
            </button>
          )}
          {isConnected && <FundButton />}
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name chain={baseSepolia} />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name chain={baseSepolia} />
                <Address />
              </Identity>
              <WalletDropdownFundLink />
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
      </div>
    </header>
  );
}
