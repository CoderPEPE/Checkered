"use client";

import { useState, useEffect } from "react";
import { parseUnits } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TOURNAMENT_ADDRESS, TOURNAMENT_ABI, EXPLORER_URL } from "../contracts";
import { sanitizeError } from "../utils/sanitizeError";
import Overlay from "./Overlay";

const SPLIT_PRESETS = [
  { label: "Winner Take All", desc: "100%", splits: [10000n] },
  { label: "Top 2", desc: "70 / 30", splits: [7000n, 3000n] },
  { label: "Top 3", desc: "60 / 30 / 10", splits: [6000n, 3000n, 1000n] },
  { label: "Top 3 Even", desc: "50 / 30 / 20", splits: [5000n, 3000n, 2000n] },
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
  const [splitIndex, setSplitIndex] = useState(2);
  const [subsessionId, setSubsessionId] = useState("");

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      setName(""); setEntryFee(""); setMaxPlayers(""); setSubsessionId("");
      const timer = setTimeout(() => { onCreated(); onClose(); }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, onCreated, onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset();
    const feeInUnits = parseUnits(entryFee, 6);
    const splits = SPLIT_PRESETS[splitIndex].splits;
    writeContract({
      address: TOURNAMENT_ADDRESS,
      abi: TOURNAMENT_ABI,
      functionName: "createTournament",
      args: [name, feeInUnits, BigInt(maxPlayers), splits, BigInt(subsessionId)],
    });
  }

  const isValid = name && entryFee && maxPlayers && subsessionId;

  return (
    <Overlay open={open} onClose={onClose} title="New Tournament">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
            Tournament Name
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
            placeholder="Friday Night Thunder"
            className="w-full bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Entry Fee</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">$</span>
              <input type="number" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} required min="0" step="0.01" placeholder="10"
                className="w-full bg-zinc-900/60 border border-zinc-800/50 rounded-xl pl-7 pr-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Max Players</label>
            <input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} required min="2" max="64" placeholder="20"
              className="w-full bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Subsession</label>
            <input type="number" value={subsessionId} onChange={(e) => setSubsessionId(e.target.value)} required min="1" placeholder="12345"
              className="w-full bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all" />
          </div>
        </div>

        {/* Prize Split */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-500 mb-2 uppercase tracking-wider">Prize Split</label>
          <div className="grid grid-cols-2 gap-2">
            {SPLIT_PRESETS.map((preset, i) => (
              <button key={i} type="button" onClick={() => setSplitIndex(i)}
                className={`text-left px-3.5 py-2.5 rounded-xl border transition-all ${
                  splitIndex === i
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                    : "bg-zinc-900/40 border-zinc-800/30 text-zinc-500 hover:border-zinc-700/50 hover:text-zinc-400"
                }`}>
                <div className="text-xs font-medium">{preset.label}</div>
                <div className={`text-[10px] mt-0.5 ${splitIndex === i ? "text-indigo-400/60" : "text-zinc-700"}`}>{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={!isValid || isPending || isConfirming}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-30 disabled:hover:from-indigo-600 disabled:hover:to-purple-600 text-white text-sm font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/15">
          {isPending ? "Waiting for wallet..." : isConfirming ? "Confirming..." : "Create Tournament"}
        </button>

        {isConfirming && txHash && (
          <div className="text-center text-xs text-amber-400 flex items-center justify-center gap-2">
            <span className="animate-spin w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full" />
            <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">View on BaseScan</a>
          </div>
        )}
        {isConfirmed && <div className="text-center text-sm text-emerald-400 font-medium">Tournament created!</div>}
        {error && <div className="text-center text-xs text-red-400">{sanitizeError(error)}</div>}
      </form>
    </Overlay>
  );
}
