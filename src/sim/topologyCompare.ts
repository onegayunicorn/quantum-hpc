/**
 * topologyCompare.ts — Side-by-side SABRE comparison across hardware topologies.
 * Topologies compared:
 *  - IBM Falcon 27Q Heavy-Hex
 *  - 5x5 Square Grid (25Q)
 *  - Trapped-Ion All-to-All (27Q)
 */

import {
  CouplingGraph,
  QLLVMCompiler,
  ibm27FalconTopology,
  squareGridTopology,
  allToAllTopology,
  decomposeCcx,
  circuitMetricsWithLayout,
  QASMParser,
  CompilationReport,
} from "./qllvmEngine";

export interface TopologyStats {
  n_qubits: number;
  avg_degree: number;
  max_degree: number;
  min_degree: number;
  diameter: number;
}

export interface TopologyRunResult extends TopologyStats {
  swaps_inserted: number;
  routed_gates: number;
  final_gate_count: number;
  final_depth: number;
  two_qubit_gates: number;
  single_qubit_gates: number;
  compilation_report: CompilationReport;
}

export interface CircuitComparison {
  name: string;
  qasm: string;
  results: Record<string, TopologyRunResult>;
}

export interface CCXSanityCheck {
  ccx_gates_decomposed: number;
  cx_inserted: number;
  single_qubit_inserted: number;
  before: {
    gate_count: number;
    two_qubit_gates: number;
    circuit_depth: number;
  };
  after: {
    gate_count: number;
    two_qubit_gates: number;
    circuit_depth: number;
  };
}

export function computeTopologyStats(cg: CouplingGraph): TopologyStats {
  const verts = Array.from(cg.vertices).sort((a, b) => a - b);
  const degrees = verts.map(v => cg.neighbors(v).size);
  let diam = 0;
  for (const a of verts) {
    for (const b of verts) {
      const d = cg.distance(a, b);
      if (d < 100000 && d > diam) {
        diam = d;
      }
    }
  }
  const avg = degrees.length > 0 ? degrees.reduce((acc, d) => acc + d, 0) / degrees.length : 0;
  return {
    n_qubits: verts.length,
    avg_degree: parseFloat(avg.toFixed(3)),
    max_degree: degrees.length > 0 ? Math.max(...degrees) : 0,
    min_degree: degrees.length > 0 ? Math.min(...degrees) : 0,
    diameter: diam,
  };
}

// Benchmark circuit generators
export function generateQftQasm(nQubits = 5): string {
  const lines: string[] = [
    "OPENQASM 2.0;",
    'include "qelib1.inc";',
    `qreg q[${nQubits}];`,
    `creg c[${nQubits}];`,
  ];
  for (let j = 0; j < nQubits; j++) {
    lines.push(`h q[${j}];`);
    for (let k = j + 1; k < nQubits; k++) {
      const angle = (Math.PI / Math.pow(2, k - j)).toFixed(6);
      lines.push(`cx q[${k}], q[${j}];`);
      lines.push(`rz(${angle}) q[${j}];`);
      lines.push(`cx q[${k}], q[${j}];`);
    }
  }
  return lines.join("\n");
}

export function generateGhzQasm(nQubits = 5): string {
  const lines: string[] = [
    "OPENQASM 2.0;",
    'include "qelib1.inc";',
    `qreg q[${nQubits}];`,
    `creg c[${nQubits}];`,
    "h q[0];",
  ];
  for (let j = 0; j < nQubits - 1; j++) {
    lines.push(`cx q[${j}], q[${j + 1}];`);
  }
  return lines.join("\n");
}

export function generateRandomQasm(nQubits = 5, depth = 30, seed = 42): string {
  let s = seed % 2147483647;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const singles = ["h", "x", "y", "z", "t", "tdg", "s", "sdg"];
  const lines: string[] = [
    "OPENQASM 2.0;",
    'include "qelib1.inc";',
    `qreg q[${nQubits}];`,
    `creg c[${nQubits}];`,
  ];
  for (let d = 0; d < depth; d++) {
    if (rand() < 0.5) {
      const q = Math.floor(rand() * nQubits);
      const gate = singles[Math.floor(rand() * singles.length)];
      lines.push(`${gate} q[${q}];`);
    } else {
      let a = Math.floor(rand() * nQubits);
      let b = Math.floor(rand() * nQubits);
      while (b === a) b = Math.floor(rand() * nQubits);
      lines.push(`cx q[${a}], q[${b}];`);
    }
  }
  return lines.join("\n");
}

export function generateToffoliChainQasm(nQubits = 5): string {
  const lines: string[] = [
    "OPENQASM 2.0;",
    'include "qelib1.inc";',
    `qreg q[${nQubits}];`,
    `creg c[${nQubits}];`,
    "h q[0];",
    "h q[1];",
  ];
  for (let j = 0; j < nQubits - 2; j++) {
    lines.push(`ccx q[${j}], q[${j + 1}], q[${j + 2}];`);
  }
  return lines.join("\n");
}

export function getStandardTopologies(): Record<string, { edges: [number, number][]; name: string; type: string }> {
  return {
    "Heavy-Hex (IBM 27Q)": {
      name: "IBM Falcon 27Q Heavy-Hex",
      type: "Superconducting (Degree 2-3)",
      edges: ibm27FalconTopology(),
    },
    "Square Grid (25Q)": {
      name: "2D Square Lattice (5x5)",
      type: "Lattice (Degree 2-4)",
      edges: squareGridTopology(5, 5),
    },
    "All-to-All (27Q)": {
      name: "Trapped-Ion / Neutral-Atom",
      type: "Fully Connected (Complete K_27)",
      edges: allToAllTopology(27),
    },
  };
}

export function runTopologyComparison(
  customQasm?: string,
  lookahead = 3
): {
  circuits: CircuitComparison[];
  ccx_sanity_check: CCXSanityCheck;
  topologies: Record<string, TopologyStats>;
  summary: {
    swap_ratio_heavyhex_over_alltoall: string;
    swap_ratio_square_over_alltoall: string;
    total_heavyhex_swaps: number;
    total_square_swaps: number;
    total_alltoall_swaps: number;
  };
} {
  const topos = getStandardTopologies();
  const topoGraphs: Record<string, { cg: CouplingGraph; stats: TopologyStats }> = {};
  const topoStatsMap: Record<string, TopologyStats> = {};

  for (const [key, t] of Object.entries(topos)) {
    const cg = new CouplingGraph(t.edges);
    const stats = computeTopologyStats(cg);
    topoGraphs[key] = { cg, stats };
    topoStatsMap[key] = stats;
  }

  const circuitList: { name: string; qasm: string }[] = [
    { name: "QFT(5)", qasm: generateQftQasm(5) },
    { name: "GHZ(5)", qasm: generateGhzQasm(5) },
    { name: "Random(5,d=30)", qasm: generateRandomQasm(5, 30) },
    { name: "ToffoliChain(5)", qasm: generateToffoliChainQasm(5) },
  ];

  if (customQasm) {
    circuitList.push({ name: "Custom Circuit", qasm: customQasm });
  }

  const circuitComparisons: CircuitComparison[] = [];
  let totalHeavyHexSwaps = 0;
  let totalSquareSwaps = 0;
  let totalAllToAllSwaps = 0;

  for (const c of circuitList) {
    const results: Record<string, TopologyRunResult> = {};
    for (const [key, { cg, stats }] of Object.entries(topoGraphs)) {
      const compiler = new QLLVMCompiler(cg, 5);
      const report = compiler.compile(c.qasm, true, lookahead);

      results[key] = {
        ...stats,
        swaps_inserted: report.swaps_inserted,
        routed_gates: report.routed_gates,
        final_gate_count: report.gate_count,
        final_depth: report.circuit_depth,
        two_qubit_gates: report.two_qubit_gates,
        single_qubit_gates: report.single_qubit_gates,
        compilation_report: report,
      };

      if (key.includes("Heavy-Hex")) totalHeavyHexSwaps += report.swaps_inserted;
      if (key.includes("Square Grid")) totalSquareSwaps += report.swaps_inserted;
      if (key.includes("All-to-All")) totalAllToAllSwaps += report.swaps_inserted;
    }
    circuitComparisons.push({
      name: c.name,
      qasm: c.qasm,
      results,
    });
  }

  // CCX Sanity check
  const parser = new QASMParser();
  const toffoliQasm = generateToffoliChainQasm(5);
  const { ops: rawOps } = parser.parse(toffoliQasm);
  const beforeMetrics = circuitMetricsWithLayout(rawOps, {});
  const ccxCount = rawOps.filter(o => o.name === "ccx" || o.name === "toffoli").length;
  const decomposedOps = decomposeCcx(rawOps);
  const afterMetrics = circuitMetricsWithLayout(decomposedOps, {});

  const ccxSanity: CCXSanityCheck = {
    ccx_gates_decomposed: ccxCount,
    cx_inserted: ccxCount * 6,
    single_qubit_inserted: ccxCount * 9,
    before: {
      gate_count: beforeMetrics.gate_count,
      two_qubit_gates: beforeMetrics.two_qubit_gates,
      circuit_depth: beforeMetrics.circuit_depth,
    },
    after: {
      gate_count: afterMetrics.gate_count,
      two_qubit_gates: afterMetrics.two_qubit_gates,
      circuit_depth: afterMetrics.circuit_depth,
    },
  };

  const ratioHH = totalAllToAllSwaps === 0
    ? `${totalHeavyHexSwaps} vs 0 (infinite)`
    : `${(totalHeavyHexSwaps / totalAllToAllSwaps).toFixed(2)}x`;

  const ratioSq = totalAllToAllSwaps === 0
    ? `${totalSquareSwaps} vs 0 (infinite)`
    : `${(totalSquareSwaps / totalAllToAllSwaps).toFixed(2)}x`;

  return {
    circuits: circuitComparisons,
    ccx_sanity_check: ccxSanity,
    topologies: topoStatsMap,
    summary: {
      swap_ratio_heavyhex_over_alltoall: ratioHH,
      swap_ratio_square_over_alltoall: ratioSq,
      total_heavyhex_swaps: totalHeavyHexSwaps,
      total_square_swaps: totalSquareSwaps,
      total_alltoall_swaps: totalAllToAllSwaps,
    },
  };
}
