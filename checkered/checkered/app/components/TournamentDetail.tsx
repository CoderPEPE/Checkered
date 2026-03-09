"use client";

import { useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TOURNAMENT_ADDRESS, TOURNAMENT_ABI, EXPLORER_URL } from "../contracts";
import { sanitizeError } from "../utils/sanitizeError";
import type { TournamentDetail as TournamentDetailType } from "../types";
import RegisterForTournament from "./RegisterForTournament";
import Overlay from "./Overlay";

// Format USDC amount from 6-decimal integer string to readable dollar value
function formatUSDC(amount: string) {
  return (Number(amount) / 1_000_000).toFixed(2);
}

// Format a unix timestamp to a readable date
function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString();
}

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  Created: "bg-green-600/20 text-green-400",
  RegistrationClosed: "bg-yellow-600/20 text-yellow-400",
  Racing: "bg-blue-600/20 text-blue-400",
  ResultsSubmitted: "bg-purple-600/20 text-purple-400",
  Completed: "bg-zinc-600/20 text-zinc-400",
  Cancelled: "bg-red-600/20 text-red-400",
};

interface Props {
  tournament: TournamentDetailType;
  isAdmin: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function TournamentDetail({
  tournament,
  isAdmin,
  onClose,
  onRefresh,
}: Props) {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Refresh tournament data after confirmation
  useEffect(() => {
    if (isConfirmed) {
      const timer = setTimeout(() => onRefresh(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, onRefresh]);

  function sendAdminTx(functionName: "closeRegistration" | "startRace" | "cancelTournament") {
    reset();
    writeContract({
      address: TOURNAMENT_ADDRESS,
      abi: TOURNAMENT_ABI,
      functionName,
      args: [BigInt(tournament.id)],
    });
  }

  const status = tournament.statusName;
  const alreadyRegistered = address
    ? tournament.players.some((p) => p.wallet.toLowerCase() === address.toLowerCase())
    : false;

  return (
    <Overlay open={true} onClose={onClose} title={tournament.name}>
      <div className="space-y-5">
        {/* Status pill */}
        <span
          className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[status] || "bg-zinc-700 text-zinc-300"}`}
        >
          {status}
        </span>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-500 mb-1">Entry Fee</div>
            <div className="text-sm font-semibold text-zinc-100">
              ${formatUSDC(tournament.entryFee)}
            </div>
            <div className="text-xs text-zinc-500">USDC</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-500 mb-1">Players</div>
            <div className="text-sm font-semibold text-zinc-100 mb-1">
              {tournament.registeredCount}/{tournament.maxPlayers}
            </div>
            <div className="h-1.5 rounded-full bg-zinc-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{
                  width: `${tournament.maxPlayers > 0 ? (tournament.registeredCount / tournament.maxPlayers) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-500 mb-1">Prize Pool</div>
            <div className="text-sm font-semibold text-zinc-100">
              ${formatUSDC(tournament.prizePool)}
            </div>
            <div className="text-xs text-zinc-500">USDC</div>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-zinc-500">
          <div>
            Split: <span className="text-zinc-300">{tournament.prizeSplits.map((s) => s / 100 + "%").join(" / ")}</span>
          </div>
          <div>
            Subsession: <span className="text-zinc-300">{tournament.iRacingSubsessionId}</span>
          </div>
          <div>
            Created: <span className="text-zinc-300">{formatDate(tournament.createdAt)}</span>
          </div>
        </div>

        {/* Registration */}
        {status === "Created" && isConnected && address && !alreadyRegistered && (
          <RegisterForTournament
            tournamentId={tournament.id}
            entryFee={tournament.entryFee}
            onRegistered={onRefresh}
          />
        )}

        {/* Player list */}
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
            Players ({tournament.players.length})
          </div>
          {tournament.players.length === 0 ? (
            <p className="text-zinc-600 text-sm">No players registered yet</p>
          ) : (
            <div className="space-y-1">
              {tournament.players.map((p) => (
                <div
                  key={p.wallet}
                  className="flex items-center justify-between bg-zinc-800 rounded px-3 py-2 text-xs font-mono"
                >
                  <span className="truncate text-zinc-300">{p.wallet}</span>
                  <span className="text-zinc-500 ml-3 whitespace-nowrap">
                    #{p.iRacingCustomerId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin actions — subtle, at the bottom */}
        {isAdmin && (status === "Created" || status === "RegistrationClosed" || status === "Racing") && (
          <div className="border-t border-zinc-800 pt-3">
            <div className="flex items-center gap-3">
              {status === "Created" && (
                <button
                  onClick={() => sendAdminTx("closeRegistration")}
                  disabled={isPending || isConfirming}
                  className="text-xs text-zinc-500 hover:text-yellow-400 disabled:opacity-50 transition-colors"
                >
                  Close Registration
                </button>
              )}
              {status === "RegistrationClosed" && (
                <button
                  onClick={() => sendAdminTx("startRace")}
                  disabled={isPending || isConfirming}
                  className="text-xs text-zinc-500 hover:text-blue-400 disabled:opacity-50 transition-colors"
                >
                  Start Race
                </button>
              )}
              <button
                onClick={() => sendAdminTx("cancelTournament")}
                disabled={isPending || isConfirming}
                className="text-xs text-zinc-500 hover:text-red-400 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Transaction feedback */}
            {isPending && (
              <div className="mt-2 text-xs text-yellow-400 flex items-center gap-2">
                <span className="animate-spin inline-block w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full" />
                Waiting for wallet...
              </div>
            )}
            {isConfirming && txHash && (
              <div className="mt-2 text-xs text-yellow-400 flex items-center gap-2">
                <span className="animate-spin inline-block w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full" />
                <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                  Confirming...
                </a>
              </div>
            )}
            {isConfirmed && txHash && (
              <div className="mt-2 text-xs text-green-400">
                Confirmed!{" "}
                <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                  View tx
                </a>
              </div>
            )}
            {error && (
              <div className="mt-2 text-xs text-red-400">
                {sanitizeError(error)}
              </div>
            )}
          </div>
        )}
      </div>
    </Overlay>
  );
}
