"use client";

import { useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TOURNAMENT_ADDRESS, TOURNAMENT_ABI, EXPLORER_URL } from "../contracts";
import { sanitizeError } from "../utils/sanitizeError";
import type { TournamentDetail as TournamentDetailType } from "../types";
import RegisterForTournament from "./RegisterForTournament";
import Overlay from "./Overlay";

function formatUSDC(amount: string) {
  return (Number(amount) / 1_000_000).toFixed(2);
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS_CONFIG: Record<string, { color: string; dot: string; border: string }> = {
  Created: { color: "text-emerald-400", dot: "bg-emerald-400", border: "border-emerald-500/20 bg-emerald-500/5" },
  RegistrationClosed: { color: "text-amber-400", dot: "bg-amber-400", border: "border-amber-500/20 bg-amber-500/5" },
  Racing: { color: "text-blue-400", dot: "bg-blue-400", border: "border-blue-500/20 bg-blue-500/5" },
  ResultsSubmitted: { color: "text-violet-400", dot: "bg-violet-400", border: "border-violet-500/20 bg-violet-500/5" },
  Completed: { color: "text-zinc-400", dot: "bg-zinc-400", border: "border-zinc-500/20 bg-zinc-500/5" },
  Cancelled: { color: "text-red-400", dot: "bg-red-400", border: "border-red-500/20 bg-red-500/5" },
};

interface Props {
  tournament: TournamentDetailType;
  isAdmin: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function TournamentDetail({ tournament, isAdmin, onClose, onRefresh }: Props) {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      const timer = setTimeout(() => onRefresh(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, onRefresh]);

  function sendAdminTx(functionName: "closeRegistration" | "startRace" | "cancelTournament") {
    // Confirm destructive actions
    if (functionName === "cancelTournament") {
      const msg = status === "Racing"
        ? "This tournament is currently RACING. Cancelling will stop the race and enable refunds. Are you sure?"
        : "Cancel this tournament? Registered players will be able to claim refunds.";
      if (!window.confirm(msg)) return;
    }
    reset();
    writeContract({ address: TOURNAMENT_ADDRESS, abi: TOURNAMENT_ABI, functionName, args: [BigInt(tournament.id)] });
  }

  const status = tournament.statusName;
  const cfg = STATUS_CONFIG[status] || { color: "text-zinc-400", dot: "bg-zinc-400", border: "border-zinc-500/20 bg-zinc-500/5" };
  const alreadyRegistered = address ? tournament.players.some((p) => p.wallet.toLowerCase() === address.toLowerCase()) : false;
  const fillPct = tournament.maxPlayers > 0 ? (tournament.registeredCount / tournament.maxPlayers) * 100 : 0;

  return (
    <Overlay open={true} onClose={onClose} title={tournament.name}>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Status */}
        <span className={`inline-flex items-center gap-2 text-xs font-semibold border ${cfg.border} ${cfg.color}`}
          style={{ padding: "6px 12px", borderRadius: "8px", alignSelf: "flex-start" }}>
          <span className={`${cfg.dot}`} style={{ width: 6, height: 6, borderRadius: "50%" }} />
          {status}
        </span>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          {/* Entry Fee */}
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px 18px" }}>
            <div style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "8px" }}>
              Entry Fee
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#fff", lineHeight: 1, marginBottom: "4px", fontVariantNumeric: "tabular-nums" }}>
              ${formatUSDC(tournament.entryFee)}
            </div>
            <div style={{ fontSize: "10px", color: "#52525b", fontWeight: 500 }}>USDC</div>
          </div>

          {/* Players */}
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px 18px" }}>
            <div style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "8px" }}>
              Players
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#fff", lineHeight: 1, marginBottom: "12px", fontVariantNumeric: "tabular-nums" }}>
              {tournament.registeredCount}
              <span style={{ fontSize: "14px", color: "#3f3f46", fontWeight: 400, marginLeft: "2px" }}>/ {tournament.maxPlayers}</span>
            </div>
            <div style={{ height: "4px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div className="progress-fill" style={{ width: `${Math.max(fillPct, 3)}%`, height: "100%" }} />
            </div>
          </div>

          {/* Prize Pool */}
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px 18px" }}>
            <div style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "8px" }}>
              Prize Pool
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#fff", lineHeight: 1, marginBottom: "4px", fontVariantNumeric: "tabular-nums" }}>
              ${formatUSDC(tournament.prizePool)}
            </div>
            <div style={{ fontSize: "10px", color: "#52525b", fontWeight: 500 }}>USDC</div>
          </div>
        </div>

        {/* Info row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          {[
            { label: "Prize Split", value: tournament.prizeSplits.map((s) => s / 100 + "%").join(" / ") },
            { label: "Subsession", value: `#${tournament.iRacingSubsessionId}` },
            { label: "Created", value: formatDate(tournament.createdAt) },
          ].map((item) => (
            <div key={item.label} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ fontSize: "10px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500, marginBottom: "4px" }}>
                {item.label}
              </div>
              <div style={{ fontSize: "13px", color: "#d4d4d8", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Winners (completed tournaments) */}
        {status === "Completed" && tournament.winners && tournament.winners.length > 0 && (
          <div>
            <div style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "12px" }}>
              Winners
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {tournament.winners.map((w) => (
                <div key={w.wallet} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "12px", background: w.position === 1 ? "rgba(234,179,8,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${w.position === 1 ? "rgba(234,179,8,0.12)" : "rgba(255,255,255,0.03)"}`, padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: w.position === 1 ? "linear-gradient(135deg, rgba(234,179,8,0.3), rgba(245,158,11,0.3))" : w.position === 2 ? "linear-gradient(135deg, rgba(148,163,184,0.3), rgba(203,213,225,0.3))" : "linear-gradient(135deg, rgba(180,83,9,0.3), rgba(217,119,6,0.3))", border: `1px solid ${w.position === 1 ? "rgba(234,179,8,0.2)" : w.position === 2 ? "rgba(148,163,184,0.2)" : "rgba(180,83,9,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: w.position === 1 ? "#fbbf24" : w.position === 2 ? "#cbd5e1" : "#d97706" }}>
                        {w.position === 1 ? "1st" : w.position === 2 ? "2nd" : `${w.position}${w.position === 3 ? "rd" : "th"}`}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", fontFamily: "var(--font-source-code-pro), monospace", color: "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.wallet}</span>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#22c55e", fontVariantNumeric: "tabular-nums", marginLeft: "12px", flexShrink: 0 }}>
                    ${formatUSDC(w.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Registration */}
        {status === "Created" && isConnected && address && !alreadyRegistered && (
          <RegisterForTournament tournamentId={tournament.id} entryFee={tournament.entryFee} onRegistered={onRefresh} />
        )}

        {/* Refund claim for cancelled tournaments */}
        {status === "Cancelled" && isConnected && address && alreadyRegistered && (
          (() => {
            const playerReg = tournament.players.find((p) => p.wallet.toLowerCase() === address.toLowerCase());
            const hasClaimed = playerReg?.refundClaimed;
            return (
              <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: "12px", padding: "16px 20px" }}>
                <div style={{ fontSize: "13px", color: "#f87171", fontWeight: 600, marginBottom: "6px" }}>
                  Tournament Cancelled
                </div>
                {hasClaimed ? (
                  <div style={{ fontSize: "12px", color: "#52525b" }}>
                    Refund already claimed
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: "12px", color: "#a1a1aa", marginBottom: "12px" }}>
                      You can claim your ${formatUSDC(tournament.entryFee)} USDC entry fee back.
                    </div>
                    <button
                      onClick={() => {
                        reset();
                        writeContract({
                          address: TOURNAMENT_ADDRESS,
                          abi: TOURNAMENT_ABI,
                          functionName: "claimRefund",
                          args: [BigInt(tournament.id)],
                        });
                      }}
                      disabled={isPending || isConfirming}
                      style={{ fontSize: "12px", fontWeight: 600, padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(34,197,94,0.15)", background: "rgba(34,197,94,0.08)", color: "#4ade80", cursor: "pointer", opacity: isPending || isConfirming ? 0.4 : 1 }}>
                      Claim Refund — ${formatUSDC(tournament.entryFee)} USDC
                    </button>
                  </>
                )}
              </div>
            );
          })()
        )}

        {/* Players */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Players</span>
            <span style={{ fontSize: "11px", color: "#3f3f46", fontVariantNumeric: "tabular-nums" }}>{tournament.players.length} registered</span>
          </div>
          {tournament.players.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", borderRadius: "12px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <p style={{ fontSize: "13px", color: "#52525b" }}>No players registered yet</p>
              <p style={{ fontSize: "11px", color: "#3f3f46", marginTop: "4px" }}>Be the first to join!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {tournament.players.map((p, i) => (
                <div key={p.wallet} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)", padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))", border: "1px solid rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#818cf8", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                    </div>
                    <span style={{ fontSize: "12px", fontFamily: "var(--font-source-code-pro), monospace", color: "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.wallet}</span>
                  </div>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-source-code-pro), monospace", color: "#52525b", fontVariantNumeric: "tabular-nums", marginLeft: "12px", flexShrink: 0 }}>iR #{p.iRacingCustomerId}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin */}
        {isAdmin && (status === "Created" || status === "RegistrationClosed" || status === "Racing") && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "20px" }}>
            <div style={{ fontSize: "10px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "12px" }}>Admin Actions</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {status === "Created" && (
                <button onClick={() => sendAdminTx("closeRegistration")} disabled={isPending || isConfirming}
                  style={{ fontSize: "12px", fontWeight: 600, padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.15)", background: "rgba(245,158,11,0.08)", color: "#fbbf24", cursor: "pointer", opacity: isPending || isConfirming ? 0.4 : 1 }}>
                  Close Registration
                </button>
              )}
              {status === "RegistrationClosed" && (
                <button onClick={() => sendAdminTx("startRace")} disabled={isPending || isConfirming}
                  style={{ fontSize: "12px", fontWeight: 600, padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(59,130,246,0.15)", background: "rgba(59,130,246,0.08)", color: "#60a5fa", cursor: "pointer", opacity: isPending || isConfirming ? 0.4 : 1 }}>
                  Start Race
                </button>
              )}
              <button onClick={() => sendAdminTx("cancelTournament")} disabled={isPending || isConfirming}
                style={{ fontSize: "12px", fontWeight: 600, padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.08)", color: "#f87171", cursor: "pointer", opacity: isPending || isConfirming ? 0.4 : 1 }}>
                Cancel Tournament
              </button>
            </div>

            {isPending && (
              <div className="mt-3 text-xs text-amber-400 flex items-center gap-2">
                <span className="animate-spin w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full" />
                Waiting for wallet...
              </div>
            )}
            {isConfirming && txHash && (
              <div className="mt-3 text-xs text-amber-400 flex items-center gap-2">
                <span className="animate-spin w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full" />
                <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">Confirming...</a>
              </div>
            )}
            {isConfirmed && txHash && (
              <div className="mt-3 text-xs text-emerald-400 font-medium">
                Confirmed! <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">View tx</a>
              </div>
            )}
            {error && <div className="mt-3 text-xs text-red-400">{sanitizeError(error)}</div>}
          </div>
        )}
      </div>
    </Overlay>
  );
}
