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
import { buildRegisterCalls } from "../calls";

interface Props {
  tournamentId: number;
  entryFee: string;
  onRegistered: () => void;
}

export default function RegisterForTournament({ tournamentId, entryFee, onRegistered }: Props) {
  const [iRacingId, setIRacingId] = useState("");

  const entryFeeBigInt = BigInt(entryFee);
  const iRacingIdNum = Number(iRacingId);
  const isValid = iRacingId.length > 0 && Number.isInteger(iRacingIdNum) && iRacingIdNum > 0;

  function handleStatus(status: LifecycleStatus) {
    if (status.statusName === "success") {
      setIRacingId("");
      setTimeout(() => onRegistered(), 2000);
    }
  }

  return (
    <div className="border-t border-zinc-800/30 pt-4">
      <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-3">
        Register for Tournament
      </div>

      <div className="mb-3">
        <label className="block text-[11px] font-medium text-zinc-500 mb-1.5">iRacing Customer ID</label>
        <input type="number" value={iRacingId} onChange={(e) => setIRacingId(e.target.value)} min="1" placeholder="123456"
          className="w-full max-w-xs bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all" />
      </div>

      {isValid && (
        <Transaction
          chainId={baseSepolia.id}
          calls={buildRegisterCalls(tournamentId, iRacingIdNum, entryFeeBigInt)}
          isSponsored
          onStatus={handleStatus}
        >
          <TransactionButton
            text={`Register — $${(Number(entryFee) / 1_000_000).toFixed(2)} USDC`}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/15"
          />
          <TransactionSponsor />
          <TransactionStatus>
            <TransactionStatusLabel className="text-sm mt-2" />
            <TransactionStatusAction className="text-sm mt-1" />
          </TransactionStatus>
        </Transaction>
      )}
    </div>
  );
}
