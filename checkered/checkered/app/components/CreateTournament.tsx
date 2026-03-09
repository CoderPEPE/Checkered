"use client";

import { useState, useEffect } from "react";
import { parseUnits } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TOURNAMENT_ADDRESS, TOURNAMENT_ABI, EXPLORER_URL } from "../contracts";
import { sanitizeError } from "../utils/sanitizeError";
import Overlay from "./Overlay";

// Preset prize split options (values in basis points, must sum to 10000)
const SPLIT_PRESETS = [
  { label: "Winner Take All (100%)", splits: [10000n] },
  { label: "Top 2 (70/30)", splits: [7000n, 3000n] },
  { label: "Top 3 (60/30/10)", splits: [6000n, 3000n, 1000n] },
  { label: "Top 3 (50/30/20)", splits: [5000n, 3000n, 2000n] },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTournament({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [entryFee, setEntryFee] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [splitIndex, setSplitIndex] = useState(2); // default to 60/30/10
  const [subsessionId, setSubsessionId] = useState("");

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Reset form, close overlay, and notify parent after successful creation
  useEffect(() => {
    if (isConfirmed) {
      setName("");
      setEntryFee("");
      setMaxPlayers("");
      setSubsessionId("");
      const timer = setTimeout(() => {
        onCreated();
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, onCreated, onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset();

    // Convert entry fee from dollars to USDC 6-decimal units
    const feeInUnits = parseUnits(entryFee, 6);
    const splits = SPLIT_PRESETS[splitIndex].splits;

    writeContract({
      address: TOURNAMENT_ADDRESS,
      abi: TOURNAMENT_ABI,
      functionName: "createTournament",
      args: [name, feeInUnits, BigInt(maxPlayers), splits, BigInt(subsessionId)],
    });
  }

  return (
    <Overlay open={open} onClose={onClose} title="New Tournament">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tournament Name */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Tournament Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Friday Night Thunder"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Entry Fee */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Entry Fee (USDC)
            </label>
            <input
              type="number"
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              required
              min="0"
              step="0.01"
              placeholder="e.g. 10.00"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Max Players */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Max Players
            </label>
            <input
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              required
              min="2"
              max="64"
              placeholder="e.g. 20"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* iRacing Subsession ID */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              iRacing Subsession ID
            </label>
            <input
              type="number"
              value={subsessionId}
              onChange={(e) => setSubsessionId(e.target.value)}
              required
              min="1"
              placeholder="e.g. 12345678"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Prize Split selector */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Prize Split
          </label>
          <div className="flex flex-wrap gap-2">
            {SPLIT_PRESETS.map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSplitIndex(i)}
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                  splitIndex === i
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2 rounded transition-colors"
          >
            {isPending
              ? "Waiting for wallet..."
              : isConfirming
                ? "Confirming..."
                : "Create Tournament"}
          </button>

          {/* Transaction feedback */}
          {isConfirming && txHash && (
            <span className="text-sm text-yellow-400 flex items-center gap-2">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full" />
              <a
                href={`${EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-yellow-300"
              >
                View on BaseScan
              </a>
            </span>
          )}
          {isConfirmed && (
            <span className="text-sm text-green-400">
              Tournament created!
            </span>
          )}
          {error && (
            <span className="text-sm text-red-400">
              {sanitizeError(error)}
            </span>
          )}
        </div>
      </form>
    </Overlay>
  );
}
