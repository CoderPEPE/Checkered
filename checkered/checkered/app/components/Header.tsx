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
  onToggleOracle: () => void;
  onNewTournament: () => void;
  showNewTournament: boolean;
}

export default function Header({ onToggleOracle, onNewTournament, showNewTournament }: Props) {
  const { isConnected } = useAccount();

  return (
    <header className="border-b border-zinc-800 px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white tracking-tight">
            Checkered
          </h1>
          <span className="text-xs px-2 py-0.5 rounded bg-green-600/20 text-green-400 border border-green-600/30">
            Base Sepolia
          </span>
          {/* Gear icon — toggles Oracle Status */}
          <button
            onClick={onToggleOracle}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Toggle Oracle Status"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M6.343 1.2a1.5 1.5 0 013.314 0l.106.489a.6.6 0 00.862.374l.442-.236a1.5 1.5 0 011.657 2.499l-.336.353a.6.6 0 00.1.94l.43.275a1.5 1.5 0 01-.628 2.788l-.49.048a.6.6 0 00-.536.724l.108.487a1.5 1.5 0 01-2.5 1.414l-.352-.337a.6.6 0 00-.94.1l-.275.43a1.5 1.5 0 01-2.788-.628l-.048-.49a.6.6 0 00-.724-.536l-.487.108a1.5 1.5 0 01-1.414-2.5l.337-.352a.6.6 0 00-.1-.94l-.43-.275a1.5 1.5 0 01.628-2.788l.49-.048a.6.6 0 00.536-.724L1.827 2.37A1.5 1.5 0 014.326.957l.353.336a.6.6 0 00.94-.1l.275-.43A1.5 1.5 0 016.343 1.2zM8 11a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Center — New Tournament button (admin only) */}
        <div className="flex items-center gap-3">
          {showNewTournament && (
            <button
              onClick={onNewTournament}
              className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
            >
              + New Tournament
            </button>
          )}

          {/* Wallet + Fund */}
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
