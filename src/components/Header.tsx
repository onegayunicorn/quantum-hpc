/**
 * Header.tsx — Top Bar Contract compliance (3 zones, clean single-line controls, no pill badges)
 */

import React from "react";
import { Play, Download, Sparkles, CheckCircle2 } from "lucide-react";

export type ActiveTab =
  | "compiler"
  | "qir"
  | "topologies"
  | "noon"
  | "benchmarks"
  | "hpc_qc"
  | "qf_network"
  | "reports"
  | "python_suite";

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onRunAll: () => void;
  isRunningAll: boolean;
  onExportAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onRunAll,
  isRunningAll,
  onExportAll,
}) => {
  const navItems: { id: ActiveTab; label: string }[] = [
    { id: "compiler", label: "QLLVM Compiler" },
    { id: "qir", label: "QIR Preview" },
    { id: "topologies", label: "Hardware Topologies" },
    { id: "noon", label: "NOON & Truth Ledger" },
    { id: "benchmarks", label: "MQTBench Suite" },
    { id: "hpc_qc", label: "ORNL HPC-QC Stack" },
    { id: "qf_network", label: "QF Network" },
    { id: "reports", label: "JSON Reports" },
    { id: "python_suite", label: "Python Suite" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold text-sm font-mono">
            Q
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-100 font-display">
            Quantum-HPC Stack
          </span>
        </div>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-slate-800 text-cyan-300 font-semibold shadow-inner"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRunAll}
            disabled={isRunningAll}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 active:scale-95 disabled:opacity-50 rounded-md transition-all shadow-sm shadow-cyan-500/30 whitespace-nowrap cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 ${isRunningAll ? "animate-spin" : ""}`} />
            <span>{isRunningAll ? "Running Suite..." : "Run All (6)"}</span>
          </button>

          <button
            onClick={onExportAll}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-md transition-colors border border-slate-700/60 whitespace-nowrap cursor-pointer"
            title="Download Master Digest & 6 JSON reports"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="flex md:hidden overflow-x-auto gap-1 pt-2 pb-1 border-t border-slate-900 mt-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap ${
              activeTab === item.id
                ? "bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-medium"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
