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
