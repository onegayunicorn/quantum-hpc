/**
 * CircuitVisualizer.tsx — Multi-wire interactive quantum circuit visualizer.
 * Supports:
 *  - Rendering 1Q, 2Q (CX, CZ, SWAP), 3Q (CCX), and Measure operations
 *  - Stage toggling: Raw QASM -> CCX Decomposed -> Single-Qubit Fused -> SABRE Routed
 */

import React, { useState } from "react";
import { InstOp } from "../sim/qllvmEngine";

interface CircuitVisualizerProps {
  stageGates: {
    raw: InstOp[];
    decomposed: InstOp[];
    fused: InstOp[];
    routed: InstOp[];
  };
  numQubits: number;
  finalLayout?: Record<number, number>;
}

export const CircuitVisualizer: React.FC<CircuitVisualizerProps> = ({
  stageGates,
  numQubits = 5,
  finalLayout,
}) => {
  const [activeStage, setActiveStage] = useState<"raw" | "decomposed" | "fused" | "routed">("routed");

  const gates = stageGates[activeStage] || [];
  const isRouted = activeStage === "routed";

  // Calculate layout coordinates
  // Horizontal spacing
  const stepX = 46;
  const startX = 60;
  const wireHeight = 44;
  const startY = 32;

  // Determine wires to draw
  const totalWires = Math.min(Math.max(numQubits, 5), 8);
  const totalWidth = Math.max(startX + gates.length * stepX + 60, 480);
  const totalHeight = startY + totalWires * wireHeight + 10;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Top stage switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
            Circuit Diagram
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {gates.length} Gates · {totalWires} Qubit Wires
          </span>
        </div>

        {/* Segmented controls for compilation stage */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(
            [
              { id: "raw", label: "1. Raw QASM" },
              { id: "decomposed", label: "2. CCX Decomposed" },
              { id: "fused", label: "3. Fused (Euler)" },
              { id: "routed", label: "4. SABRE Routed" },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveStage(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeStage === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Circuit wire diagram with horizontal scroll */}
      <div className="w-full overflow-x-auto bg-slate-950 rounded-lg border border-slate-800/80 p-2">
        <svg
          width={totalWidth}
          height={totalHeight}
          className="select-none font-mono text-xs"
        >
          {/* Background horizontal qubit wires */}
          {Array.from({ length: totalWires }).map((_, q) => {
            const y = startY + q * wireHeight;
            const physId = isRouted && finalLayout ? finalLayout[q] : undefined;

            return (
              <g key={`wire-${q}`}>
                {/* Qubit wire line */}
                <line
                  x1={startX - 10}
                  y1={y}
                  x2={totalWidth - 20}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1.5"
                />

                {/* Wire label */}
                <text
                  x={12}
                  y={y + 4}
                  fill="#94A3B8"
                  fontSize="11"
                  fontWeight="600"
                >
                  {isRouted && physId !== undefined ? `Q${physId}(q${q})` : `q[${q}]`}
                </text>
              </g>
            );
          })}

          {/* Render gates along the horizontal step positions */}
          {gates.map((op, colIdx) => {
            const x = startX + colIdx * stepX;
            const name = op.name.toLowerCase();

            // 1. Single Qubit Gate
            if (op.qubits.length === 1) {
              const q = op.qubits[0];
              if (q >= totalWires) return null;
              const y = startY + q * wireHeight;

              let bg = "#0284C7"; // Cyan
              let stroke = "#38BDF8";
              let label = name.toUpperCase();

              if (name === "x") {
                bg = "#E11D48";
                stroke = "#FB7185";
              } else if (name === "z") {
                bg = "#2563EB";
                stroke = "#60A5FA";
              } else if (name === "h") {
                bg = "#0D9488";
                stroke = "#2DD4BF";
              } else if (["rx", "ry", "rz"].includes(name)) {
                bg = "#D97706";
                stroke = "#FBBF24";
                const paramStr = op.params[0] !== undefined ? `${op.params[0].toFixed(2)}` : "";
                label = `${name.toUpperCase()}(${paramStr})`;
              } else if (["t", "tdg", "s", "sdg"].includes(name)) {
                bg = "#7C3AED";
                stroke = "#A78BFA";
              } else if (name === "measure") {
                bg = "#475569";
                stroke = "#94A3B8";
                label = "M";
              }

              const boxWidth = label.length > 3 ? 36 : 24;

              return (
                <g key={`gate-${colIdx}`} transform={`translate(${x}, ${y})`}>
                  <rect
                    x={-boxWidth / 2}
                    y={-12}
                    width={boxWidth}
                    height={24}
                    rx={4}
                    fill={bg}
                    stroke={stroke}
                    strokeWidth={1.5}
                  />
                  <text
                    x={0}
                    y={3.5}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={label.length > 5 ? "8" : "10"}
                    fontWeight="bold"
                  >
                    {label}
                  </text>
                </g>
              );
            }

            // 2. Two Qubit Gate: CX / CNOT
            if ((name === "cx" || name === "cnot") && op.qubits.length >= 2) {
              const [c, t] = op.qubits;
              if (c >= totalWires || t >= totalWires) return null;
              const yC = startY + c * wireHeight;
              const yT = startY + t * wireHeight;

              return (
                <g key={`cx-${colIdx}`}>
                  {/* Vertical connecting wire */}
                  <line
                    x1={x}
                    y1={yC}
                    x2={x}
                    y2={yT}
                    stroke="#38BDF8"
                    strokeWidth="2"
                  />
                  {/* Control dot */}
                  <circle cx={x} cy={yC} r={5} fill="#38BDF8" />
                  {/* Target ring + crosshair */}
                  <circle
                    cx={x}
                    cy={yT}
                    r={10}
                    fill="#0F172A"
                    stroke="#38BDF8"
                    strokeWidth="2"
                  />
                  <line
                    x1={x - 6}
                    y1={yT}
                    x2={x + 6}
                    y2={yT}
                    stroke="#38BDF8"
                    strokeWidth="2"
                  />
                  <line
                    x1={x}
                    y1={yT - 6}
                    x2={x}
                    y2={yT + 6}
                    stroke="#38BDF8"
                    strokeWidth="2"
                  />
                </g>
              );
            }

            // 3. SWAP Gate
            if (name === "swap" && op.qubits.length >= 2) {
              const [q0, q1] = op.qubits;
              if (q0 >= totalWires || q1 >= totalWires) return null;
              const y0 = startY + q0 * wireHeight;
              const y1 = startY + q1 * wireHeight;

              return (
                <g key={`swap-${colIdx}`}>
                  {/* Connecting wire */}
                  <line
                    x1={x}
                    y1={y0}
                    x2={x}
                    y2={y1}
                    stroke="#F59E0B"
                    strokeWidth="2"
                  />
                  {/* X marks at q0 */}
                  <line
                    x1={x - 5}
                    y1={y0 - 5}
                    x2={x + 5}
                    y2={y0 + 5}
                    stroke="#F59E0B"
                    strokeWidth="2.5"
                  />
                  <line
                    x1={x - 5}
                    y1={y0 + 5}
                    x2={x + 5}
                    y2={y0 - 5}
                    stroke="#F59E0B"
                    strokeWidth="2.5"
                  />
                  {/* X marks at q1 */}
                  <line
                    x1={x - 5}
                    y1={y1 - 5}
                    x2={x + 5}
                    y2={y1 + 5}
                    stroke="#F59E0B"
                    strokeWidth="2.5"
                  />
                  <line
                    x1={x - 5}
                    y1={y1 + 5}
                    x2={x + 5}
                    y2={y1 - 5}
                    stroke="#F59E0B"
                    strokeWidth="2.5"
                  />
                </g>
              );
            }

            // 4. Three Qubit Gate: CCX / Toffoli
            if ((name === "ccx" || name === "toffoli") && op.qubits.length >= 3) {
              const [c1, c2, t] = op.qubits;
              if (c1 >= totalWires || c2 >= totalWires || t >= totalWires) return null;
              const yC1 = startY + c1 * wireHeight;
              const yC2 = startY + c2 * wireHeight;
              const yT = startY + t * wireHeight;
              const minY = Math.min(yC1, yC2, yT);
              const maxY = Math.max(yC1, yC2, yT);

              return (
                <g key={`ccx-${colIdx}`}>
                  <line
                    x1={x}
                    y1={minY}
                    x2={x}
                    y2={maxY}
                    stroke="#EC4899"
                    strokeWidth="2"
                  />
                  <circle cx={x} cy={yC1} r={5} fill="#EC4899" />
                  <circle cx={x} cy={yC2} r={5} fill="#EC4899" />
                  <circle
                    cx={x}
                    cy={yT}
                    r={10}
                    fill="#0F172A"
                    stroke="#EC4899"
                    strokeWidth="2"
                  />
                  <line
                    x1={x - 6}
                    y1={yT}
                    x2={x + 6}
                    y2={yT}
                    stroke="#EC4899"
                    strokeWidth="2"
                  />
                  <line
                    x1={x}
                    y1={yT - 6}
                    x2={x}
                    y2={yT + 6}
                    stroke="#EC4899"
                    strokeWidth="2"
                  />
                </g>
              );
            }

            return null;
          })}
        </svg>
      </div>

      {/* Stage explanation note */}
      <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
        <span>
          {activeStage === "raw" && "Original OpenQASM 2.0 instructions before compiler transformation."}
          {activeStage === "decomposed" && "Each CCX (Toffoli) decomposed into 6 CX + 9 single-qubit gates (Barenco)."}
          {activeStage === "fused" && "Consecutive single-qubit chains fused into compact Euler rotations (ZYZ/XYX/ZXZ)."}
          {activeStage === "routed" && "SABRE routing pass with shortest-path SWAP insertions onto physical coupling graph."}
        </span>
        <span className="text-cyan-400 font-semibold">{gates.length} Ops in Stage</span>
      </div>
    </div>
  );
};
