/**
 * PythonSuiteView.tsx — Interactive Python Source Code Browser & Downloader.
 */

import React, { useState } from "react";
import { PYTHON_SCRIPTS, PythonScript } from "../sim/pythonFiles";
import { Code, Download, Copy, Check, Terminal, ShieldCheck } from "lucide-react";

export const PythonSuiteView: React.FC = () => {
  const [selectedScriptIdx, setSelectedScriptIdx] = useState<number>(1); // qllvm_sim.py default
  const [copied, setCopied] = useState<boolean>(false);

  const script = PYTHON_SCRIPTS[selectedScriptIdx] || PYTHON_SCRIPTS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(script.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([script.code], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = script.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2.5">
            <Code className="w-5 h-5 text-cyan-400" />
            Standalone Python Simulation Suite
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-3xl">
            Runnable standalone Python source files matching arXiv:2604.15094v1, ORNL FGCS 2026, and QF Network.
            Includes all 4 SABRE lookahead routing fixes.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/60">
          <ShieldCheck className="w-4 h-4" />
          <span>Dependencies: numpy&gt;=1.24 only</span>
        </div>
      </div>

      {/* Grid: Left script tabs (30%), Right code preview (70%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Script Selector */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          {PYTHON_SCRIPTS.map((s, idx) => {
            const isSelected = selectedScriptIdx === idx;
            return (
              <button
                key={s.filename}
                onClick={() => setSelectedScriptIdx(idx)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  isSelected
                    ? "bg-slate-900 border-cyan-500/80 shadow-md shadow-cyan-500/10 text-white"
                    : "bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-300">{s.filename}</span>
                </div>
                <span className="text-xs text-white font-medium">{s.title}</span>
                <span className="text-[11px] text-slate-400 line-clamp-2">{s.description}</span>
              </button>
            );
          })}
        </div>

        {/* Right Column: Code Viewer */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-xs font-semibold text-slate-200 font-mono flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                {script.filename}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{script.title}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy Code"}</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-cyan-300 hover:text-white bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/80 rounded transition-colors cursor-pointer font-mono"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save .py</span>
              </button>
            </div>
          </div>

          <pre className="bg-slate-950 font-mono text-xs text-cyan-200/90 p-4 rounded-lg border border-slate-800 overflow-x-auto max-h-[580px] leading-relaxed select-text">
            {script.code}
          </pre>
        </div>
      </div>
    </div>
  );
};
