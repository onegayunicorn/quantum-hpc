/**
 * HpcQcStackView.tsx — Interactive simulation of the ORNL hardware-agnostic HPC-QC stack.
 * Reference: Elsevier FGCS 2026 (Shehata et al.) & ACM HPQCI '24 (Saurabh et al.)
 */

import React, { useState, useMemo } from "react";
import {
  runFullHpcQcSimulation,
  ORNL_LAYERS,
  simulateVqls,
  simulateMiniAppMotif,
  MINIAPP_MOTIFS,
} from "../sim/hpcQcSim";
import { Server, Cpu, Play, CheckCircle2, RefreshCw, Activity, Layers } from "lucide-react";

export const HpcQcStackView: React.FC = () => {
  const [qpuSlots, setQpuSlots] = useState<number>(1);
  const [patternMode, setPatternMode] = useState<"simultaneous" | "interleaved">("simultaneous");
  const [nJobs, setNJobs] = useState<number>(20);
  const [selectedLayerIdx, setSelectedLayerIdx] = useState<number>(2); // QPM API default

  const hpcData = useMemo(() => {
    return runFullHpcQcSimulation(nJobs, qpuSlots, patternMode);
  }, [nJobs, qpuSlots, patternMode]);

  const vqls = hpcData.vqls_demo;
  const activeLayer = ORNL_LAYERS[selectedLayerIdx];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2.5">
          <Server className="w-5 h-5 text-cyan-400" />
          ORNL Hardware-Agnostic HPC-QC Software Stack
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-3xl">
          Complete model of the 7-layer architecture from Oak Ridge National Laboratory (FGCS 2026),
          featuring Slurm-style dual-scheduling, VQLS variational solver, and 6 ACM mini-app motifs.
        </p>
      </div>

      {/* 7-Layer Architectural Stack Breakdown */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            7-Layer Software Stack &amp; Latency Profile
          </span>
          <span className="text-xs text-slate-500 font-mono">Select a layer to inspect profile</span>
        </div>

        {/* Layer horizontal / vertical stack */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {ORNL_LAYERS.map((layer, idx) => {
            const isSelected = selectedLayerIdx === idx;
            return (
              <button
                key={layer.name}
                onClick={() => setSelectedLayerIdx(idx)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-cyan-950/70 border-cyan-500/80 shadow-md shadow-cyan-500/10"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] text-slate-500 font-mono">L{idx + 1}</span>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold">
                    {layer.latency_us} µs
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-200 mt-2 line-clamp-2">
                  {layer.name}
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-1">
                  {layer.bandwidth_gbps} Gbps
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Layer Detail Box */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div>
            <span className="text-slate-400">Layer {selectedLayerIdx + 1}: </span>
            <strong className="text-white font-bold">{activeLayer.name}</strong>
            <p className="text-slate-400 text-[11px] mt-0.5">{activeLayer.notes}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Latency Overhead</span>
              <span className="text-cyan-400 font-bold text-sm">{activeLayer.latency_us} µs</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Interface Bandwidth</span>
              <span className="text-purple-400 font-bold text-sm">{activeLayer.bandwidth_gbps} Gbps</span>
            </div>
          </div>
        </div>
      </div>

      {/* Discrete Scheduler Simulator & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scheduler Controls & Live Queue (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Slurm/QCUP Dual Scheduler Simulation
            </span>

            {/* Workload Pattern Switcher */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setPatternMode("simultaneous")}
                className={`px-2.5 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                  patternMode === "simultaneous"
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Simultaneous
              </button>
              <button
                onClick={() => setPatternMode("interleaved")}
                className={`px-2.5 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                  patternMode === "interleaved"
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Interleaved
              </button>
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">QPU Slots:</span>
                <span className="text-cyan-400 font-mono font-bold">{qpuSlots}</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                value={qpuSlots}
                onChange={e => setQpuSlots(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Batch Job Count:</span>
                <span className="text-cyan-400 font-mono font-bold">{nJobs} jobs</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={nJobs}
                onChange={e => setNJobs(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Scheduler Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Completed</span>
              <span className="text-base font-bold text-white">
                {hpcData.scheduler_stats.completed} jobs
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Makespan</span>
              <span className="text-base font-bold text-cyan-400">
                {hpcData.scheduler_stats.makespan_us} µs
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Avg Wait Time</span>
              <span className="text-base font-bold text-amber-400">
                {hpcData.scheduler_stats.avg_wait_us} µs
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Throughput</span>
              <span className="text-base font-bold text-emerald-400">
                {hpcData.scheduler_stats.throughput_per_ms} /ms
              </span>
            </div>
          </div>

          {/* Job Dispatch Table */}
          <div className="overflow-x-auto bg-slate-950 rounded-lg border border-slate-800 max-h-56">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 text-slate-400 sticky top-0 bg-slate-900">
                <tr>
                  <th className="py-1.5 px-2.5">Job ID</th>
                  <th className="py-1.5 px-2.5">Kind</th>
                  <th className="py-1.5 px-2.5">Qubits</th>
                  <th className="py-1.5 px-2.5">Shots</th>
                  <th className="py-1.5 px-2.5">Pattern</th>
                  <th className="py-1.5 px-2.5 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {hpcData.jobs_dispatched.slice(0, 15).map(j => (
                  <tr key={j.id} className="hover:bg-slate-900/40">
                    <td className="py-1.5 px-2.5 text-cyan-400">#{j.id}</td>
                    <td className="py-1.5 px-2.5 text-slate-300 uppercase">{j.kind}</td>
                    <td className="py-1.5 px-2.5 text-slate-300">{j.n_qubits} Q</td>
                    <td className="py-1.5 px-2.5 text-slate-300">{j.shots}</td>
                    <td className="py-1.5 px-2.5 text-purple-300">{j.pattern}</td>
                    <td className="py-1.5 px-2.5 text-right text-emerald-400 tabular-nums">
                      {j.duration_us} µs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* VQLS Convergence Plot & Mini-App Motifs (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* VQLS Demonstration Solver */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                VQLS Cost Convergence (Ax = b)
              </span>
              <span className="text-xs text-emerald-400 font-mono font-bold">
                Final: {vqls.final_cost}
              </span>
            </div>

            {/* SVG Convergence Curve */}
            <div className="w-full h-36 bg-slate-950 rounded-lg border border-slate-800 p-2 flex items-center justify-center">
              <svg viewBox="0 0 300 110" className="w-full h-full select-none font-mono text-[9px]">
                {/* Horizontal reference lines */}
                <line x1="20" y1="15" x2="290" y2="15" stroke="#334155" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="20" y1="55" x2="290" y2="55" stroke="#334155" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="20" y1="95" x2="290" y2="95" stroke="#334155" strokeWidth="0.8" />

                <text x="5" y="18" fill="#64748B">1.0</text>
                <text x="5" y="58" fill="#64748B">0.5</text>
                <text x="5" y="98" fill="#64748B">0.0</text>

                {/* Plot polyline */}
                {(() => {
                  const points = vqls.cost_history.map((cost, idx) => {
                    const x = 25 + (idx / (vqls.cost_history.length - 1)) * 260;
                    const y = 95 - cost * 80;
                    return `${x},${y}`;
                  }).join(" ");

                  return (
                    <>
                      <polyline
                        fill="none"
                        stroke="#06B6D4"
                        strokeWidth="2"
                        points={points}
                      />
                      {vqls.cost_history.map((cost, idx) => {
                        if (idx % 8 !== 0 && idx !== vqls.cost_history.length - 1) return null;
                        const x = 25 + (idx / (vqls.cost_history.length - 1)) * 260;
                        const y = 95 - cost * 80;
                        return <circle key={idx} cx={x} cy={y} r={3} fill="#22D3EE" />;
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>

            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Ansatz: {vqls.ansatz_layers} layers</span>
              <span>System: 4 Qubits</span>
              <span>40 Iterations (ORNL LDRD)</span>
            </div>
          </div>

          {/* 6 Quantum Mini-App Motifs */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <span className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
              6 Execution Motifs (ACM HPQCI &apos;24)
            </span>

            <div className="flex flex-col gap-2">
              {Object.entries(hpcData.mini_apps).map(([key, m]) => (
                <div key={key} className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs font-mono">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-cyan-300">{m.name}</span>
                    <span className="text-slate-400 text-[11px]">{m.total_us} µs</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">{m.description}</span>
                  {/* Micro timeline bars */}
                  <div className="flex gap-1 mt-1.5 h-1.5 w-full bg-slate-900 rounded overflow-hidden">
                    {m.timeline_us.map((t, idx) => (
                      <div
                        key={idx}
                        style={{ flex: t }}
                        className="bg-cyan-500/70 hover:bg-cyan-400 transition-colors"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
