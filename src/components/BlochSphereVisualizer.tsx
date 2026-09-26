/**
 * BlochSphereVisualizer.tsx — 3D projection of the Bloch Sphere and state vector.
 */

import React, { useState, useMemo } from "react";
import { QuantumStateSimulator, BlochCoords } from "../sim/quantumState";
import { InstOp } from "../sim/qllvmEngine";

interface BlochSphereVisualizerProps {
  ops: InstOp[];
  numQubits: number;
}

export const BlochSphereVisualizer: React.FC<BlochSphereVisualizerProps> = ({
  ops,
  numQubits = 5,
}) => {
  const [selectedQubit, setSelectedQubit] = useState<number>(0);

  // Compute state vector by running the circuit through state simulator
  const { coords, ketString, prob0, prob1 } = useMemo(() => {
    const sim = new QuantumStateSimulator(Math.min(numQubits, 5));
    for (const op of ops) {
      sim.applyGate(op.name, op.qubits, op.params);
    }
    const b = sim.getBlochCoords(selectedQubit);
    const snap = sim.getSnapshot();
    return {
      coords: b,
      ketString: snap.ketString,
      prob0: b.prob0,
      prob1: b.prob1,
    };
  }, [ops, numQubits, selectedQubit]);

  // Isometric 3D Projection math
  // Vector (x, y, z) on sphere of radius R = 65
  const cx = 110;
  const cy = 100;
  const R = 68;

  // Projection angles (tilt = 20 deg, rotate = 35 deg)
  const proj = (x: number, y: number, z: number) => {
    // 3D rotation matrix
    const cosA = Math.cos(0.55);
    const sinA = Math.sin(0.55);
    const cosB = Math.cos(0.35);
    const sinB = Math.sin(0.35);

    const x1 = x * cosA - y * sinA;
    const y1 = x * sinA + y * cosA;
    const z1 = z;

    const x2 = x1;
    const y2 = y1 * cosB - z1 * sinB;
    const z2 = y1 * sinB + z1 * cosB;

    return {
      px: cx + x2 * R,
      py: cy - z2 * R,
      pz: y2,
    };
  };

  const tip = proj(coords.x, coords.y, coords.z);
  const north = proj(0, 0, 1);
  const south = proj(0, 0, -1);
  const east = proj(1, 0, 0);
  const west = proj(-1, 0, 0);
  const front = proj(0, 1, 0);
  const back = proj(0, -1, 0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Header with target qubit selector */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
            Bloch Sphere &amp; State Vector
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 font-mono mr-1">Target Qubit:</span>
          {Array.from({ length: Math.min(numQubits, 5) }).map((_, q) => (
            <button
              key={`q-btn-${q}`}
              onClick={() => setSelectedQubit(q)}
              className={`px-2 py-0.5 text-xs font-mono rounded cursor-pointer transition-colors ${
                selectedQubit === q
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              q{q}
            </button>
          ))}
        </div>
      </div>

      {/* Main visualizer grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Sphere SVG canvas */}
        <div className="relative w-full h-[200px] bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 220 200"
            className="w-full h-full select-none"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Sphere backdrop circle */}
            <circle
              cx={cx}
              cy={cy}
              r={R}
              fill="rgba(15, 23, 42, 0.6)"
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* Equator ellipse (z=0) */}
            <ellipse
              cx={cx}
              cy={cy}
              rx={R}
              ry={R * 0.35}
              fill="none"
              stroke="#1E293B"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            {/* Meridian ellipse (x=0) */}
            <ellipse
              cx={cx}
              cy={cy}
              rx={R * 0.55}
              ry={R}
              fill="none"
              stroke="#1E293B"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            {/* Axes: Z-axis (North-South) */}
            <line
              x1={south.px}
              y1={south.py}
              x2={north.px}
              y2={north.py}
              stroke="#475569"
              strokeWidth="1.2"
            />
            {/* X-axis */}
            <line
              x1={west.px}
              y1={west.py}
              x2={east.px}
              y2={east.py}
              stroke="#475569"
              strokeWidth="1"
            />
            {/* Y-axis */}
            <line
              x1={back.px}
              y1={back.py}
              x2={front.px}
              y2={front.py}
              stroke="#475569"
              strokeWidth="1"
            />

            {/* Axis Labels */}
            <text x={north.px} y={north.py - 6} textAnchor="middle" fill="#38BDF8" fontSize="10" fontWeight="bold">
              |0⟩
            </text>
            <text x={south.px} y={south.py + 12} textAnchor="middle" fill="#64748B" fontSize="10">
              |1⟩
            </text>
            <text x={east.px + 8} y={east.py + 3} textAnchor="start" fill="#64748B" fontSize="8">
              +X
            </text>
            <text x={front.px} y={front.py + 10} textAnchor="middle" fill="#64748B" fontSize="8">
              +Y
            </text>

            {/* State vector arrow from (cx, cy) to tip (px, py) */}
            <line
              x1={cx}
              y1={cy}
              x2={tip.px}
              y2={tip.py}
              stroke="#06B6D4"
              strokeWidth="2.5"
            />
            {/* Vector endpoint dot */}
            <circle cx={tip.px} cy={tip.py} r={4.5} fill="#22D3EE" stroke="#083344" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Numeric Telemetry & Coordinates */}
        <div className="flex flex-col gap-2.5 text-xs font-mono">
          {/* Coordinates HUD */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Coord X</span>
              <span className="text-white font-semibold text-sm">{coords.x}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Coord Y</span>
              <span className="text-white font-semibold text-sm">{coords.y}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Coord Z</span>
              <span className="text-cyan-400 font-semibold text-sm">{coords.z}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Polar Angle (θ)</span>
              <span className="text-slate-200">
                {coords.theta} rad ({((coords.theta * 180) / Math.PI).toFixed(1)}°)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Azimuth Phase (φ)</span>
              <span className="text-slate-200">
                {coords.phi} rad ({((coords.phi * 180) / Math.PI).toFixed(1)}°)
              </span>
            </div>
          </div>

          {/* Probabilities bar */}
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">P(|0⟩): {(prob0 * 100).toFixed(1)}%</span>
              <span className="text-slate-300">P(|1⟩): {(prob1 * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${Math.round(prob0 * 100)}%` }}
                className="bg-cyan-500 h-full transition-all duration-300"
              />
              <div
                style={{ width: `${Math.round(prob1 * 100)}%` }}
                className="bg-slate-600 h-full transition-all duration-300"
              />
            </div>
          </div>

          {/* Ket state string */}
          <div className="bg-slate-950 px-2.5 py-1.5 rounded-md border border-slate-800 text-[11px] text-slate-300 overflow-x-auto whitespace-nowrap">
            <span className="text-slate-500 mr-1.5">|ψ⟩ =</span>
            <span className="text-cyan-300 font-bold">{ketString}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
