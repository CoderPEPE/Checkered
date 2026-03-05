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
  entryFee: string; // USDC in 6-decimal units (string from API)
  onRegistered: () => void;
}

/**
 * Registration form + OnchainKit Transaction component.
 * Batches USDC approve + tournament register into a single transaction flow.
 */
export default function RegisterForTournament({
  tournamentId,
  entryFee,
  onRegistered,
}: Props) {
  const [iRacingId, setIRacingId] = useState("");

  const entryFeeBigInt = BigInt(entryFee);
  const iRacingIdNum = Number(iRacingId);
  const isValid = iRacingId.length > 0 && iRacingIdNum > 0;

  function handleStatus(status: LifecycleStatus) {
    if (status.statusName === "success") {
      setIRacingId("");
      // Give the backend time to index the event before refreshing
      setTimeout(() => onRegistered(), 2000);
    }
  }

  return (
    <div className="border-t border-zinc-800 pt-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
        Register
      </div>

      {/* iRacing ID input */}
      <div className="mb-3">
        <label className="block text-sm text-zinc-400 mb-1">
          iRacing Customer ID
        </label>
        <input
          type="number"
          value={iRacingId}
          onChange={(e) => setIRacingId(e.target.value)}
          min="1"
          placeholder="e.g. 123456"
          className="w-full max-w-xs bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* OnchainKit Transaction — batches approve + register */}
      {isValid && (
        <Transaction
          chainId={baseSepolia.id}
          calls={buildRegisterCalls(tournamentId, iRacingIdNum, entryFeeBigInt)}
          isSponsored
          onStatus={handleStatus}
        >
          <TransactionButton
            text={`Register — $${(Number(entryFee) / 1_000_000).toFixed(2)} USDC`}
            className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-6 py-2 rounded transition-colors"
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
