/**
 * TopologyComparisonView.tsx — Side-by-side hardware topology comparative analysis.
 * Compares IBM Falcon 27Q Heavy-Hex vs 25Q Square Grid vs 27Q All-to-All Ion Trap.
 */

import React, { useState, useMemo } from "react";
import { runTopologyComparison, CircuitComparison } from "../sim/topologyCompare";
import { TopologyGraphVisualizer } from "./TopologyGraphVisualizer";
import { GitCompare, Cpu, ShieldCheck, ArrowRight, Activity } from "lucide-react";

export const TopologyComparisonView: React.FC = () => {
  const [selectedCircuitIdx, setSelectedCircuitIdx] = useState<number>(0);
  const [lookahead, setLookahead] = useState<number>(3);

  const comparisonData = useMemo(() => {
    return runTopologyComparison(undefined, lookahead);
  }, [lookahead]);

  const activeCircuit = comparisonData.circuits[selectedCircuitIdx] || comparisonData.circuits[0];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Title Banner */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2.5">
          <GitCompare className="w-5 h-5 text-cyan-400" />
          Hardware Topology Comparative Analysis
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-3xl">
          Side-by-side evaluation of SABRE routing performance across superconducting Heavy-Hex (IBM Falcon 27Q),
          2D Square Lattice, and Trapped-Ion All-to-All architectures.
        </p>
      </div>

      {/* Summary Highlights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
            Heavy-Hex vs All-to-All Swap Ratio
          </span>
          <span className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {comparisonData.summary.swap_ratio_heavyhex_over_alltoall}
          </span>
          <span className="text-[11px] text-slate-500 font-mono mt-1">
            Total SWAPs: {comparisonData.summary.total_heavyhex_swaps} vs 0 in All-to-All
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
            Square Grid vs All-to-All Swap Ratio
          </span>
          <span className="text-2xl font-bold font-mono text-cyan-400 mt-1">
            {comparisonData.summary.swap_ratio_square_over_alltoall}
          </span>
          <span className="text-[11px] text-slate-500 font-mono mt-1">
            Total SWAPs: {comparisonData.summary.total_square_swaps} in 2D grid
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
            CCX Decomposition Factor
          </span>
          <span className="text-2xl font-bold font-mono text-purple-400 mt-1">
            6 CX + 9 1Q / CCX
          </span>
          <span className="text-[11px] text-slate-500 font-mono mt-1">
            Barenco unitary equivalence (N&amp;C Fig 4.9)
          </span>
        </div>
      </div>

      {/* Circuit Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-slate-500 font-mono mr-1">Benchmark Circuit:</span>
        {comparisonData.circuits.map((c, idx) => (
          <button
            key={c.name}
            onClick={() => setSelectedCircuitIdx(idx)}
            className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              selectedCircuitIdx === idx
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Side-by-Side Comparison Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
            SABRE Routing Metrics for {activeCircuit.name}
          </span>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Lookahead: {lookahead} gates</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
              <tr>
                <th className="py-2.5 px-3">Hardware Topology</th>
                <th className="py-2.5 px-3 text-right">Physical Qubits</th>
                <th className="py-2.5 px-3 text-right">Avg Degree</th>
                <th className="py-2.5 px-3 text-right">Diameter</th>
                <th className="py-2.5 px-3 text-right text-amber-300">SWAPs Inserted</th>
                <th className="py-2.5 px-3 text-right text-cyan-300">Final Gate Count</th>
                <th className="py-2.5 px-3 text-right">Circuit Depth</th>
                <th className="py-2.5 px-3 text-right">CX Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Object.entries(activeCircuit.results).map(([topoName, r]) => (
                <tr key={topoName} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        topoName.includes("Heavy-Hex")
                          ? "bg-amber-400"
                          : topoName.includes("Square")
                          ? "bg-cyan-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    {topoName}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300 tabular-nums">{r.n_qubits}</td>
                  <td className="py-3 px-3 text-right text-slate-300 tabular-nums">{r.avg_degree}</td>
                  <td className="py-3 px-3 text-right text-slate-300 tabular-nums">{r.diameter}</td>
                  <td className="py-3 px-3 text-right font-bold text-amber-400 tabular-nums">
                    {r.swaps_inserted}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-cyan-300 tabular-nums">
                    {r.final_gate_count}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-200 tabular-nums">{r.final_depth}</td>
                  <td className="py-3 px-3 text-right text-purple-300 tabular-nums">{r.two_qubit_gates}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visualizers Comparison: Falcon 27Q vs Square Grid 25Q */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopologyGraphVisualizer
          topologyKey="Heavy-Hex (IBM 27Q)"
          layout={activeCircuit.results["Heavy-Hex (IBM 27Q)"]?.compilation_report.layout || {}}
          finalLayout={activeCircuit.results["Heavy-Hex (IBM 27Q)"]?.compilation_report.final_layout}
          swapLog={activeCircuit.results["Heavy-Hex (IBM 27Q)"]?.compilation_report.swap_log}
        />

        <TopologyGraphVisualizer
          topologyKey="Square Grid (25Q)"
          layout={activeCircuit.results["Square Grid (25Q)"]?.compilation_report.layout || {}}
          finalLayout={activeCircuit.results["Square Grid (25Q)"]?.compilation_report.final_layout}
          swapLog={activeCircuit.results["Square Grid (25Q)"]?.compilation_report.swap_log}
        />
      </div>

      {/* CCX Decomposition Sanity Check Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Barenco CCX Decomposition Sanity Check
        </div>

        <p className="text-xs text-slate-400 leading-relaxed font-mono">
          Evaluating ToffoliChain(5) through the canonical Barenco decomposition pass. Every 3-qubit CCX gate
          expands into exactly 6 CX + 9 single-qubit gates (h, t, tdg), preserving the unitary state up to global phase.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">CCX Decomposed</span>
            <span className="text-base font-bold text-white">
              {comparisonData.ccx_sanity_check.ccx_gates_decomposed} gates
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">CX Injected</span>
            <span className="text-base font-bold text-cyan-400">
              +{comparisonData.ccx_sanity_check.cx_inserted} CX
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">1Q Injected</span>
            <span className="text-base font-bold text-purple-400">
              +{comparisonData.ccx_sanity_check.single_qubit_inserted} 1Q
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Gates Before → After</span>
            <span className="text-base font-bold text-amber-400">
              {comparisonData.ccx_sanity_check.before.gate_count} → {comparisonData.ccx_sanity_check.after.gate_count}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
