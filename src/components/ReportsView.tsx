/**
 * ReportsView.tsx — Interactive inspector and exporter for all 6 simulation reports + digest.json.
 */

import React, { useState, useMemo } from "react";
import { runAllSimulations, downloadJsonFile, MasterReportBundle } from "../sim/masterReports";
import { FileJson, Download, Copy, Check, Terminal, ExternalLink } from "lucide-react";

export const ReportsView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<keyof MasterReportBundle["files"]>("digest.json");
  const [copied, setCopied] = useState<boolean>(false);

  const bundle = useMemo(() => {
    return runAllSimulations();
  }, []);

  const filesList: { id: keyof MasterReportBundle["files"]; label: string; desc: string }[] = [
    { id: "digest.json", label: "Master Digest", desc: "Consolidated summary metrics across all 5 simulation engines." },
    { id: "01_extracted_data.json", label: "01 Extracted Data", desc: "Facts, numbers, authors, DOIs, and toolchain constants." },
    { id: "02_qllvm_pipeline.json", label: "02 QLLVM Pipeline", desc: "Full compilation report, QIR calls, and SABRE layout." },
    { id: "03_benchmark.json", label: "03 Benchmark Comparison", desc: "MQTBench reductions vs Qiskit, Cirq, and PennyLane." },
    { id: "04_hpc_qc_stack.json", label: "04 HPC-QC Stack", desc: "ORNL 7 layers, scheduler makespan, VQLS solver, and 6 motifs." },
    { id: "05_qf_network.json", label: "05 QF Network", desc: "SPIN validator blocks and PolkaVM RISC-V contract gas results." },
    { id: "06_topology_comparison.json", label: "06 Topology Comparison", desc: "IBM Falcon 27Q vs Square Grid vs Ion Trap with CCX sanity check." },
  ];

  const currentContent = bundle.files[selectedFile];
  const jsonString = JSON.stringify(currentContent, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCurrent = () => {
    downloadJsonFile(selectedFile, currentContent);
  };

  const handleDownloadAll = () => {
    for (const [fname, data] of Object.entries(bundle.files)) {
      downloadJsonFile(fname, data);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2.5">
            <FileJson className="w-5 h-5 text-cyan-400" />
            Official Simulation JSON Reports
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-3xl">
            Complete cryptographic state and empirical test results exported directly into standard
            reproducible JSON reports.
          </p>
        </div>

        <button
          onClick={handleDownloadAll}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-all shadow-md shadow-cyan-500/20 whitespace-nowrap cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Download All 7 Files</span>
        </button>
      </div>

      {/* Grid: Left file switcher (35%), Right live JSON viewer (65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Selector Cards */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
          {filesList.map(f => {
            const isSelected = selectedFile === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFile(f.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  isSelected
                    ? "bg-slate-900 border-cyan-500/80 shadow-md shadow-cyan-500/10 text-white"
                    : "bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-300">{f.id}</span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">{f.label}</span>
                </div>
                <span className="text-xs text-slate-400 line-clamp-2">{f.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Right Column: Code Viewer */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-semibold text-slate-200 font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              {selectedFile}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy JSON"}</span>
              </button>

              <button
                onClick={handleDownloadCurrent}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-cyan-300 hover:text-white bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/80 rounded transition-colors cursor-pointer font-mono"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save .json</span>
              </button>
            </div>
          </div>

          <pre className="bg-slate-950 font-mono text-xs text-cyan-200/90 p-4 rounded-lg border border-slate-800 overflow-x-auto max-h-[560px] leading-relaxed select-text">
            {jsonString}
          </pre>
        </div>
      </div>
    </div>
  );
};
