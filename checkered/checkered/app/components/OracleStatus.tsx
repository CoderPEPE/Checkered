"use client";

import type { OracleData } from "../types";

interface Props {
  oracle: OracleData | null;
  loading: boolean;
}

export default function OracleStatus({ oracle, loading }: Props) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
        Oracle Status
      </h2>
      {oracle ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-zinc-500">Address</div>
            <div className="font-mono text-xs truncate" title={oracle.address}>
              {oracle.address}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">Contract</div>
            <div className="font-mono text-xs truncate" title={oracle.contract}>
              {oracle.contract}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">Mock Mode</div>
            <div>{oracle.mockMode ? "Enabled" : "Disabled"}</div>
          </div>
          <div>
            <div className="text-zinc-500">Poll Interval</div>
            <div>{Number(oracle.pollInterval) / 1000}s</div>
          </div>
        </div>
      ) : (
        !loading && (
          <p className="text-zinc-500">Could not load oracle status</p>
        )
      )}
    </section>
  );
}
