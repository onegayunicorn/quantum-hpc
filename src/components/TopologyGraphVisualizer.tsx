/**
 * TopologyGraphVisualizer.tsx — Interactive hardware coupling graph visualizer.
 * Supports:
 *  - IBM Falcon 27Q Heavy-Hex (3-row hexagonal staggered grid)
 *  - 5x5 Square Grid (25Q)
 *  - Complete All-to-All Ion Trap (27Q)
 *  - Live SWAP route stepping & logical-to-physical qubit mapping overlay
 */

import React, { useState, useMemo } from "react";
import { SwapLogEntry } from "../sim/qllvmEngine";
import { Play, Pause, SkipBack, SkipForward, Info } from "lucide-react";

interface TopologyGraphVisualizerProps {
  topologyKey: "Heavy-Hex (IBM 27Q)" | "Square Grid (25Q)" | "All-to-All (27Q)";
  layout: Record<number, number>; // logical -> physical
  finalLayout?: Record<number, number>;
  swapLog?: SwapLogEntry[];
  highlightEdge?: [number, number] | null;
  onSelectNode?: (physicalNode: number) => void;
}

interface NodeCoord {
  id: number;
  x: number;
  y: number;
  degree: number;
  isHeavy: boolean;
}

export const TopologyGraphVisualizer: React.FC<TopologyGraphVisualizerProps> = ({
  topologyKey,
  layout,
  finalLayout,
  swapLog = [],
  highlightEdge,
  onSelectNode,
}) => {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(-1); // -1 = initial, swapLog.length = final
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Compute node coordinates based on topology
  const { nodes, edges } = useMemo(() => {
    const coords: NodeCoord[] = [];
    let edgeList: [number, number][] = [];

    if (topologyKey.includes("Heavy-Hex")) {
      // 3 rows: 0..8, 9..17, 18..26
      const startX = 40;
      const stepX = 54;
      // Row 0
      for (let i = 0; i <= 8; i++) {
        coords.push({
          id: i,
          x: startX + i * stepX,
          y: 50,
          degree: [1, 3, 5, 7].includes(i) ? 3 : [0, 8].includes(i) ? 1 : 2,
          isHeavy: [1, 3, 5, 7].includes(i),
        });
      }
      // Row 1
      for (let i = 9; i <= 17; i++) {
        const c = i - 9;
        const isDeg3 = [10, 12, 14, 16, 9, 11, 13, 15, 17].includes(i);
        coords.push({
          id: i,
          x: startX + c * stepX,
          y: 140,
          degree: [9, 17].includes(i) ? 2 : 3,
          isHeavy: [10, 12, 14, 16].includes(i),
        });
      }
      // Row 2
      for (let i = 18; i <= 26; i++) {
        const c = i - 18;
        coords.push({
          id: i,
          x: startX + c * stepX,
          y: 230,
          degree: [18, 20, 22, 24, 26].includes(i) ? 3 : 2,
          isHeavy: [18, 20, 22, 24, 26].includes(i),
        });
      }

      edgeList = [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8],
        [1, 10], [3, 12], [5, 14], [7, 16],
        [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17],
        [9, 18], [11, 20], [13, 22], [15, 24], [17, 26],
        [18, 19], [19, 20], [20, 21], [21, 22], [22, 23], [23, 24], [24, 25], [25, 26],
      ];
    } else if (topologyKey.includes("Square Grid")) {
      const rows = 5;
      const cols = 5;
      const startX = 70;
      const startY = 40;
      const gapX = 72;
      const gapY = 50;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const id = r * cols + c;
          let deg = 4;
          if ((r === 0 || r === 4) && (c === 0 || c === 4)) deg = 2;
          else if (r === 0 || r === 4 || c === 0 || c === 4) deg = 3;

          coords.push({
            id,
            x: startX + c * gapX,
            y: startY + r * gapY,
            degree: deg,
            isHeavy: deg === 4,
          });
          if (c + 1 < cols) edgeList.push([id, id + 1]);
          if (r + 1 < rows) edgeList.push([id, id + cols]);
        }
      }
    } else {
      // All-to-All 27Q (Circle layout)
      const n = 27;
      const cx = 260;
      const cy = 145;
      const radius = 115;
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        coords.push({
          id: i,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          degree: n - 1,
          isHeavy: true,
        });
        for (let j = i + 1; j < n; j++) {
          edgeList.push([i, j]);
        }
      }
    }

    return { nodes: coords, edges: edgeList };
  }, [topologyKey]);

  // Compute active mapping at currentStep
  const activeLayout = useMemo(() => {
    const cur: Record<number, number> = { ...layout };
    if (currentStep >= 0 && swapLog && swapLog.length > 0) {
      const upTo = Math.min(currentStep, swapLog.length - 1);
      for (let i = 0; i <= upTo; i++) {
        const s = swapLog[i];
        if (!s || !s.swapped_logical || !s.swapped_physical) continue;
        const [l0, l1] = s.swapped_logical;
        const [p0, p1] = s.swapped_physical;
        if (l0 >= 0) cur[l0] = p1;
        if (l1 >= 0) cur[l1] = p0;
      }
    }
    return cur;
  }, [layout, currentStep, swapLog]);

  // Reverse mapping: physical -> logical
  const physToLogMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const [lStr, p] of Object.entries(activeLayout)) {
      m.set(p, parseInt(lStr, 10));
    }
    return m;
  }, [activeLayout]);

  const activeSwappingEdge = useMemo<[number, number] | null>(() => {
    if (currentStep >= 0 && currentStep < swapLog.length && swapLog[currentStep]?.swapped_physical) {
      return swapLog[currentStep].swapped_physical;
    }
    return highlightEdge || null;
  }, [currentStep, swapLog, highlightEdge]);

  // Reset or clamp currentStep when swapLog changes
  React.useEffect(() => {
    if (!swapLog || swapLog.length === 0) {
      setCurrentStep(-1);
      setIsPlaying(false);
    } else if (currentStep >= swapLog.length) {
      setCurrentStep(swapLog.length - 1);
    }
  }, [swapLog, currentStep]);

  // Autoplay handler
  React.useEffect(() => {
    let timer: any;
    if (isPlaying && swapLog && swapLog.length > 0) {
      timer = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= swapLog.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    }
    return () => clearInterval(timer);
  }, [isPlaying, swapLog]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Top status bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200 uppercase tracking-wider font-mono">
            {topologyKey}
          </span>
          <span className="text-slate-500 font-mono">
            {nodes.length} Physical Qubits · {edges.length} Couplers
          </span>
        </div>

        {/* SWAP stepping controls */}
        {swapLog.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
            <button
              onClick={() => setCurrentStep(-1)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              title="Reset to initial layout"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-cyan-400 hover:text-cyan-300 p-0.5 rounded cursor-pointer"
              title={isPlaying ? "Pause" : "Play swap animation"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setCurrentStep(prev => Math.min(prev + 1, swapLog.length - 1))}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              title="Next SWAP step"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-400 text-[11px] font-mono ml-1">
              Step {currentStep + 1} / {swapLog.length}
            </span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-[290px] bg-slate-950/80 rounded-lg border border-slate-800/80 overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 520 280"
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Coupler edges */}
          <g className="edges">
            {edges.map(([a, b], idx) => {
              const na = nodes[a];
              const nb = nodes[b];
              if (!na || !nb) return null;

              const isSwapping =
                activeSwappingEdge &&
                ((activeSwappingEdge[0] === a && activeSwappingEdge[1] === b) ||
                  (activeSwappingEdge[0] === b && activeSwappingEdge[1] === a));

              const isHovered = hoveredNode === a || hoveredNode === b;

              return (
                <line
                  key={`edge-${idx}`}
                  x1={na.x}
                  y1={na.y}
                  x2={nb.x}
                  y2={nb.y}
                  stroke={
                    isSwapping
                      ? "#F59E0B"
                      : isHovered
                      ? "#38BDF8"
                      : topologyKey.includes("All-to-All")
                      ? "rgba(51, 65, 85, 0.25)"
                      : "rgba(51, 65, 85, 0.6)"
                  }
                  strokeWidth={isSwapping ? 3.5 : isHovered ? 2 : 1.2}
                  strokeDasharray={isSwapping ? "4 3" : undefined}
                  className="transition-colors duration-200"
                />
              );
            })}
          </g>

          {/* Physical Qubit Nodes */}
          <g className="nodes">
            {nodes.map(n => {
              const assignedLogical = physToLogMap.get(n.id);
              const isAssigned = assignedLogical !== undefined;
              const isHovered = hoveredNode === n.id;
              const isSwappingNode =
                activeSwappingEdge &&
                (activeSwappingEdge[0] === n.id || activeSwappingEdge[1] === n.id);

              return (
                <g
                  key={`node-${n.id}`}
                  transform={`translate(${n.x}, ${n.y})`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredNode(n.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => onSelectNode?.(n.id)}
                >
                  {/* Outer pulse when swapping */}
                  {isSwappingNode && (
                    <circle
                      r="16"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2"
                      className="animate-ping opacity-75"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    r={isAssigned ? 12 : 9}
                    fill={
                      isSwappingNode
                        ? "#F59E0B"
                        : isAssigned
                        ? "#0284C7"
                        : isHovered
                        ? "#334155"
                        : "#1E293B"
                    }
                    stroke={
                      isSwappingNode
                        ? "#FDE68A"
                        : isAssigned
                        ? "#38BDF8"
                        : n.isHeavy
                        ? "#64748B"
                        : "#475569"
                    }
                    strokeWidth={isAssigned ? 2.5 : n.isHeavy ? 2 : 1}
                    className="transition-all duration-150"
                  />

                  {/* Node text: logical qubit tag if assigned, else physical ID */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isAssigned ? "#FFFFFF" : "#94A3B8"}
                    fontSize={isAssigned ? "9" : "8"}
                    fontWeight={isAssigned ? "bold" : "normal"}
                    className="font-mono pointer-events-none select-none"
                  >
                    {isAssigned ? `q${assignedLogical}` : n.id}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating tooltip on hover */}
        {hoveredNode !== null && (
          <div className="absolute bottom-2 left-2 bg-slate-900/95 border border-slate-700/80 px-2.5 py-1.5 rounded-md text-[11px] font-mono text-slate-300 shadow-xl pointer-events-none z-10 flex items-center gap-3">
            <span>
              Physical: <strong className="text-white">Q{hoveredNode}</strong>
            </span>
            <span>·</span>
            <span>
              Logical:{" "}
              <strong className="text-cyan-400">
                {physToLogMap.has(hoveredNode) ? `q${physToLogMap.get(hoveredNode)}` : "unassigned"}
              </strong>
            </span>
            <span>·</span>
            <span>
              Degree: <strong className="text-white">{nodes[hoveredNode]?.degree}</strong>{" "}
              {nodes[hoveredNode]?.isHeavy && "(Heavy)"}
            </span>
          </div>
        )}
      </div>

      {/* Legend & quick helper */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 border border-cyan-400 inline-block" />
            <span>Active Logical Qubit (q₀..q₄)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-500 inline-block" />
            <span>Unassigned Physical Node</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Active SWAP</span>
          </span>
        </div>

        {swapLog && swapLog.length > 0 && currentStep >= 0 && swapLog[currentStep]?.swapped_physical && (
          <span className="text-amber-400 font-medium">
            SWAP Q{swapLog[currentStep].swapped_physical[0]} ↔ Q{swapLog[currentStep].swapped_physical[1]} (Cost: {swapLog[currentStep]?.cost_after ?? "?"})
          </span>
        )}
      </div>
    </div>
  );
};
