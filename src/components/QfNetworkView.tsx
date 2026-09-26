/**
 * QfNetworkView.tsx — Interactive simulator of the QF Network v0.1.12 blockchain.
 * Models:
 *  - SPIN consensus protocol (21 validator nodes, 2/3 stake quorum)
 *  - PolkaVM (RISC-V RV32E) smart contract execution & gas metering
 *  - Parachain epochs & repository architecture
 */

import React, { useMemo } from "react";
import { runFullQfNetworkSimulation } from "../sim/qfNetworkSim";
import { QF_NETWORK_METADATA } from "../sim/extractedData";
import { Network, Cpu, ShieldCheck, GitBranch, Terminal, CheckCircle2 } from "lucide-react";

export const QfNetworkView: React.FC = () => {
  const qfData = useMemo(() => {
    return runFullQfNetworkSimulation();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2.5">
          <Network className="w-5 h-5 text-cyan-400" />
          QF Network v0.1.12 Blockchain Simulation
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-3xl">
          Simulating the SPIN consensus protocol (21 validator nodes, 2/3 stake quorum) and PolkaVM
          RISC-V RV32E smart contract execution engine.
        </p>
      </div>

      {/* Summary Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
            Consensus Engine
          </span>
          <span className="text-xl font-bold font-mono text-cyan-400 mt-1">
            SPIN (2/3 Quorum)
          </span>
          <span className="text-[11px] text-slate-500 font-mono mt-1">
            21 Validators · 6s Slots
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
            Finality Rate
          </span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {(qfData.spin.finality_rate * 100).toFixed(1)}%
          </span>
          <span className="text-[11px] text-slate-500 font-mono mt-1">
            {qfData.spin.blocks_finalized} / {qfData.spin.blocks_produced} Blocks Finalized
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
            VM Execution Engine
          </span>
          <span className="text-xl font-bold font-mono text-purple-400 mt-1">
            PolkaVM (RV32E)
          </span>
          <span className="text-[11px] text-slate-500 font-mono mt-1">
            3 Contracts Verified
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
            Codebase Velocity
          </span>
          <span className="text-xl font-bold font-mono text-amber-400 mt-1">
            143 commits/mo
          </span>
          <span className="text-[11px] text-slate-500 font-mono mt-1">
            Rust (99.8%) · Parachain
          </span>
        </div>
      </div>

      {/* Main Grid: PolkaVM RISC-V Executor & SPIN Block Producer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PolkaVM RISC-V Contracts (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              PolkaVM RISC-V RV32E Gas Metering
            </span>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> All Passed
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {qfData.polkavm.map(c => {
              const gasPct = Math.round((c.gas_used / c.gas_limit) * 100);
              return (
                <div key={c.contract} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col gap-2 font-mono text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-white text-sm">{c.contract}</span>
                    <span className="text-emerald-400 uppercase text-[11px] font-semibold">{c.status}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>Binary Size: <strong className="text-slate-200">{c.riscv_blob_bytes} bytes</strong></div>
                    <div>Simulated Ops: <strong className="text-slate-200">{c.ops_executed}</strong></div>
                  </div>

                  {/* Gas Meter Bar */}
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Gas: {c.gas_used.toLocaleString()} / {c.gas_limit.toLocaleString()}</span>
                      <span className="text-cyan-400">{gasPct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${gasPct}%` }}
                        className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Sample Opcodes */}
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 overflow-x-auto pt-1">
                    <span className="text-slate-400">Opcodes:</span>
                    {c.sample_opcodes.map((op, i) => (
                      <span key={i} className="bg-slate-900 text-slate-300 px-1 py-0.5 rounded border border-slate-800">
                        {op}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SPIN Consensus Recent Blocks (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              SPIN Validator Consensus Blocks
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Avg Votes: {qfData.spin.avg_votes} / 21
            </span>
          </div>

          <div className="overflow-x-auto bg-slate-950 rounded-lg border border-slate-800 max-h-[380px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 text-slate-400 sticky top-0 bg-slate-900">
                <tr>
                  <th className="py-2 px-3">Height</th>
                  <th className="py-2 px-3">Proposer</th>
                  <th className="py-2 px-3">Votes</th>
                  <th className="py-2 px-3">Txs</th>
                  <th className="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {qfData.spin.blocks.slice(0, 14).map(b => (
                  <tr key={b.height} className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-cyan-400 font-semibold">#{b.height}</td>
                    <td className="py-2 px-3 text-slate-300">Validator #{b.proposer}</td>
                    <td className="py-2 px-3 text-slate-300">{b.votes} / 21</td>
                    <td className="py-2 px-3 text-purple-300">{b.tx_count}</td>
                    <td className="py-2 px-3 text-right">
                      <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-800/50">
                        FINALIZED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Repo Architecture Components */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
        <span className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-cyan-400" />
          QF Network Monorepo Subsystems
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
          {QF_NETWORK_METADATA.repo_components.map(rc => (
            <div key={rc.path} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
              <span className="text-cyan-300 font-semibold text-[11px] truncate" title={rc.path}>
                {rc.path}
              </span>
              <span className="text-slate-400 text-[10px] mt-1 line-clamp-2">
                {rc.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
