/**
 * MqtBenchView.tsx — Interactive MQTBench compiler benchmark suite.
 * Evaluates QLLVM against Qiskit 1.2.4, Cirq 1.5.0, and PennyLane 0.42.3.
 */

import React, { useState, useMemo } from "react";
import { runBenchmarkSuite, MQTBENCH_ALGORITHMS, QUBIT_COUNTS } from "../sim/benchmarkCompare";
import { BarChart3, TrendingDown, Layers, Search, Filter } from "lucide-react";

export const MqtBenchView: React.FC = () => {
  const [selectedAlgo, setSelectedAlgo] = useState<string>("QFT");
  const [selectedQubits, setSelectedQubits] = useState<number>(15);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const benchmarkData = useMemo(() => {
    return runBenchmarkSuite();
  }, []);

  const filteredAlgos = useMemo(() => {
    return MQTBENCH_ALGORITHMS.filter(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  // Find sample metrics for selected algorithm & qubits
  const currentMetric = useMemo(() => {
    const item = benchmarkData.sample_algorithms.find(
      s => s.algo === selectedAlgo && s.qubits === selectedQubits
    );
    if (item) return item;

    // Fallback to first available for algorithm
    return (
      benchmarkData.sample_algorithms.find(s => s.algo === selectedAlgo) ||
      benchmarkData.sample_algorithms[0]
    );
  }, [benchmarkData, selectedAlgo, selectedQubits]);

  const compilers = ["QLLVM", "Cirq", "Qiskit", "PennyLane"] as const;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          MQTBench Suite: Compiler Benchmark Comparison
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-3xl">
          Empirical evaluation across 25 quantum algorithms and 3–30 qubits comparing QLLVM with
          Qiskit 1.2.4, Cirq 1.5.0, and PennyLane 0.42.3.
        </p>
      </div>

      {/* Reported Benchmark Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* vs Qiskit */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 font-mono">QLLVM vs Qiskit 1.2.4</span>
            <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-0.5">
              <TrendingDown className="w-3.5 h-3.5" /> Better
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-cyan-400">
              -{benchmarkData.reported.QLLVM_vs_Qiskit.gate_reduction_pct}%
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Gate count reduction</span>
          </div>
          <div className="text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/80 flex justify-between">
            <span>Depth Reduction:</span>
            <span className="text-emerald-400 font-semibold">
              -{benchmarkData.reported.QLLVM_vs_Qiskit.depth_reduction_pct}%
            </span>
          </div>
        </div>

        {/* vs Cirq */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 font-mono">QLLVM vs Cirq 1.5.0</span>
            <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-0.5">
              <TrendingDown className="w-3.5 h-3.5" /> Better
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-cyan-400">
              -{benchmarkData.reported.QLLVM_vs_Cirq.gate_reduction_pct}%
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Gate count reduction</span>
          </div>
          <div className="text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/80 flex justify-between">
            <span>Depth Reduction:</span>
            <span className="text-emerald-400 font-semibold">
              -{benchmarkData.reported.QLLVM_vs_Cirq.depth_reduction_pct}%
            </span>
          </div>
        </div>

        {/* vs PennyLane */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 font-mono">QLLVM vs PennyLane 0.42.3</span>
            <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-0.5">
              <TrendingDown className="w-3.5 h-3.5" /> Massive
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-cyan-400">
              -{benchmarkData.reported.QLLVM_vs_PennyLane.gate_reduction_pct}%
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Gate count reduction (~4x)</span>
          </div>
          <div className="text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/80 flex justify-between">
            <span>Depth Reduction:</span>
            <span className="text-emerald-400 font-semibold">
              -{benchmarkData.reported.QLLVM_vs_PennyLane.depth_reduction_pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Algorithm & Qubit Inspector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
            Algorithm Inspector ({selectedAlgo} on {currentMetric.qubits} Qubits)
          </span>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter 25 algorithms..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 w-48 sm:w-60"
            />
          </div>
        </div>

        {/* Algorithm Chips (Interactive buttons) */}
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-950 rounded-lg border border-slate-800">
          {filteredAlgos.map(algo => (
            <button
              key={algo}
              onClick={() => setSelectedAlgo(algo)}
              className={`px-2.5 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                selectedAlgo === algo
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              {algo}
            </button>
          ))}
        </div>

        {/* Comparative Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Gate count bar comparison */}
          <div className="flex flex-col gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <span className="text-xs font-mono text-slate-300 font-semibold uppercase">
              Gate Count Comparison (Lower is Better)
            </span>
            <div className="flex flex-col gap-2.5">
              {compilers.map(c => {
                const gates = currentMetric.compilers[c]?.gates || 100;
                const maxGates = currentMetric.compilers.PennyLane?.gates || 400;
                const widthPct = Math.min(Math.round((gates / maxGates) * 100), 100);
                const isQllvm = c === "QLLVM";

                return (
                  <div key={`gates-${c}`} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className={isQllvm ? "text-cyan-400 font-bold" : "text-slate-400"}>
                        {c}
                      </span>
                      <span className="text-white font-semibold tabular-nums">{gates} gates</span>
                    </div>
                    <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          isQllvm ? "bg-cyan-400" : c === "PennyLane" ? "bg-rose-500/80" : "bg-slate-500"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Circuit depth bar comparison */}
          <div className="flex flex-col gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <span className="text-xs font-mono text-slate-300 font-semibold uppercase">
              Circuit Depth Comparison (Lower is Better)
            </span>
            <div className="flex flex-col gap-2.5">
              {compilers.map(c => {
                const depth = currentMetric.compilers[c]?.depth || 50;
                const maxDepth = currentMetric.compilers.PennyLane?.depth || 200;
                const widthPct = Math.min(Math.round((depth / maxDepth) * 100), 100);
                const isQllvm = c === "QLLVM";

                return (
                  <div key={`depth-${c}`} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className={isQllvm ? "text-cyan-400 font-bold" : "text-slate-400"}>
                        {c}
                      </span>
                      <span className="text-white font-semibold tabular-nums">{depth} layers</span>
                    </div>
                    <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          isQllvm ? "bg-cyan-400" : c === "PennyLane" ? "bg-rose-500/80" : "bg-slate-500"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Suite Averages Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
        <span className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
          Full Suite Averages Across {benchmarkData.total_datapoints} Benchmark Executions
        </span>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
              <tr>
                <th className="py-2.5 px-3">Compiler Target</th>
                <th className="py-2.5 px-3 text-right">Average Gates</th>
                <th className="py-2.5 px-3 text-right">Average Depth</th>
                <th className="py-2.5 px-3 text-right">QLLVM Gate Advantage</th>
                <th className="py-2.5 px-3 text-right">QLLVM Depth Advantage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="bg-cyan-500/10 font-bold text-white">
                <td className="py-2.5 px-3 text-cyan-300">QLLVM (LLVM 12.0.1 + MLIR)</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{benchmarkData.averages.QLLVM.avg_gates}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{benchmarkData.averages.QLLVM.avg_depth}</td>
                <td className="py-2.5 px-3 text-right text-emerald-400">Baseline</td>
                <td className="py-2.5 px-3 text-right text-emerald-400">Baseline</td>
              </tr>
              <tr className="hover:bg-slate-800/40 text-slate-300">
                <td className="py-2.5 px-3">Cirq 1.5.0</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{benchmarkData.averages.Cirq.avg_gates}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{benchmarkData.averages.Cirq.avg_depth}</td>
                <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">-1.19%</td>
                <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">-1.61%</td>
              </tr>
              <tr className="hover:bg-slate-800/40 text-slate-300">
                <td className="py-2.5 px-3">Qiskit 1.2.4</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{benchmarkData.averages.Qiskit.avg_gates}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{benchmarkData.averages.Qiskit.avg_depth}</td>
                <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">-3.98%</td>
                <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">-3.56%</td>
              </tr>
              <tr className="hover:bg-slate-800/40 text-slate-300">
                <td className="py-2.5 px-3">PennyLane 0.42.3</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{benchmarkData.averages.PennyLane.avg_gates}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{benchmarkData.averages.PennyLane.avg_depth}</td>
                <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">-74.96%</td>
                <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">-77.06%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
