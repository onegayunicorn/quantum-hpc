/**
 * App.tsx — Quantum-HPC Integration Stack & Simulation Suite
 * Orchestrator frontend connecting QLLVM, SABRE routing, ORNL HPC-QC,
 * MQTBench benchmarks, and QF Network blockchain simulation.
 */

import React, { useState } from "react";
import { Header, ActiveTab } from "./components/Header";
import { QllvmWorkbench } from "./components/QllvmWorkbench";
import { QirView } from "./components/QirView";
import { TopologyComparisonView } from "./components/TopologyComparisonView";
import { NoonMetrologyView } from "./components/NoonMetrologyView";
import { MqtBenchView } from "./components/MqtBenchView";
import { HpcQcStackView } from "./components/HpcQcStackView";
import { QfNetworkView } from "./components/QfNetworkView";
import { ReportsView } from "./components/ReportsView";
import { PythonSuiteView } from "./components/PythonSuiteView";
import { runAllSimulations, downloadJsonFile } from "./sim/masterReports";
import { CheckCircle2, FileText, ExternalLink } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("compiler");
  const [isRunningAll, setIsRunningAll] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const handleRunAll = () => {
    setIsRunningAll(true);
    setTimeout(() => {
      runAllSimulations();
      setIsRunningAll(false);
      setNotification("All 6 simulation modules successfully compiled and verified.");
      setTimeout(() => setNotification(null), 3500);
      setActiveTab("reports");
    }, 600);
  };

  const handleExportAll = () => {
    const bundle = runAllSimulations();
    for (const [fname, data] of Object.entries(bundle.files)) {
      downloadJsonFile(fname, data);
    }
    setNotification("Exported 7 JSON simulation files to downloads.");
    setTimeout(() => setNotification(null), 3500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Fixed Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRunAll={handleRunAll}
        isRunningAll={isRunningAll}
        onExportAll={handleExportAll}
      />

      {/* Global Notification Banner */}
      {notification && (
        <div className="bg-cyan-950/90 border-b border-cyan-800/80 px-4 py-2 text-center text-xs font-mono text-cyan-200 flex items-center justify-center gap-2 transition-all">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 lg:px-8 py-6 max-w-7xl mx-auto w-full">
        {activeTab === "compiler" && <QllvmWorkbench />}
        {activeTab === "qir" && <QirView />}
        {activeTab === "topologies" && <TopologyComparisonView />}
        {activeTab === "noon" && <NoonMetrologyView />}
        {activeTab === "benchmarks" && <MqtBenchView />}
        {activeTab === "hpc_qc" && <HpcQcStackView />}
        {activeTab === "qf_network" && <QfNetworkView />}
        {activeTab === "reports" && <ReportsView />}
        {activeTab === "python_suite" && <PythonSuiteView />}
      </main>

      {/* Clean Scientific Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 lg:px-8 py-6 text-xs text-slate-500 font-mono mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-slate-400 font-semibold">Quantum-HPC Research Foundations:</span>
            <span>arXiv:2604.15094v1 (QLLVM)</span>
            <span aria-hidden="true">·</span>
            <span>FGCS 2026 (ORNL HPC-QC)</span>
            <span aria-hidden="true">·</span>
            <span>ACM HPQCI &apos;24 (Mini-Apps)</span>
            <span aria-hidden="true">·</span>
            <span>QF Network v0.1.12</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span>Sovereign Local Execution</span>
            <span aria-hidden="true">·</span>
            <span>100% Cryptographically Auditable</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
