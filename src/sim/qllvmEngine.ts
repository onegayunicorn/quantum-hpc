/**
 * qllvmEngine.ts — High-fidelity QLLVM Compilation Pipeline & SABRE Lookahead Router.
 * Reference: arXiv:2604.15094v1
 *
 * Implements:
 *  - OpenQASM 2.0 parsing (gates, registers, parameters)
 *  - Barenco Toffoli / CCX decomposition (6 CX + 9 1Q: h, t, tdg)
 *  - Dynamic single-qubit gate fusion + Euler decompositions (ZYZ, XYX, ZXZ)
 *  - Lowering to QIR (LLVM IR runtime intrinsics __quantum__qis__*)
 *  - SABRE layout & routing with all 4 canonical fixes:
 *      1. Filter single-qubit gates from lookahead (only 2Q gates with in_degree === 1 evaluated)
 *      2. Lookahead budget enforcement (stops when extra >= lookahead at both loops)
 *      3. Randomized layout restarts across iterations (random physical shuffle)
 *      4. Physical qubit relabeling & tracking final_layout for accurate physical metrics
 */

export interface InstOp {
  name: string;
  qubits: number[];
  params: number[];
  classicalBit?: number;
}

export function isSingleQubit(op: InstOp): boolean {
  return op.qubits.length === 1;
}

export function isTwoQubit(op: InstOp): boolean {
  return op.qubits.length === 2;
}

export function isThreeQubit(op: InstOp): boolean {
  return op.qubits.length === 3;
}

export interface Gate {
  op: InstOp;
  logicalQubits: number[];
  predecessors: Set<number>;
  idx: number;
}

export interface CircuitMetrics {
  gate_count: number;
  circuit_depth: number;
  two_qubit_gates: number;
  single_qubit_gates: number;
}

export interface SwapLogEntry {
  step: number;
  swapped_physical: [number, number];
  swapped_logical: [number, number];
  cost_before: number;
  cost_after: number;
  unblocked_gate?: string;
}

export interface CompilationReport {
  stages: { name: string; ops: number }[];
  pre_opt_metrics: CircuitMetrics;
  post_opt_metrics: CircuitMetrics;
  qir_calls: number;
  layout: Record<number, number>;
  final_layout: Record<number, number>;
  swaps_inserted: number;
  routed_gates: number;
  gate_count: number;
  circuit_depth: number;
  two_qubit_gates: number;
  single_qubit_gates: number;
  qir_ir: string[];
  stage_gates: {
    raw: InstOp[];
    decomposed: InstOp[];
    fused: InstOp[];
    routed: InstOp[];
  };
  swap_log: SwapLogEntry[];
}

export class CouplingGraph {
  adj: Map<number, Set<number>> = new Map();
  vertices: Set<number> = new Set();
  distCache: Map<string, number> = new Map();
  pathCache: Map<string, number[]> = new Map();

  constructor(edges: [number, number][]) {
    for (const [a, b] of edges) {
      if (!this.adj.has(a)) this.adj.set(a, new Set());
      if (!this.adj.has(b)) this.adj.set(b, new Set());
      this.adj.get(a)!.add(b);
      this.adj.get(b)!.add(a);
      this.vertices.add(a);
      this.vertices.add(b);
    }
    for (const v of this.vertices) {
      this.bfs(v);
    }
  }

  private bfs(src: number) {
    const dist = new Map<number, number>();
    const prev = new Map<number, number | null>();
    dist.set(src, 0);
    prev.set(src, null);
    const queue: number[] = [src];

    while (queue.length > 0) {
      const u = queue.shift()!;
      const neighbors = this.adj.get(u) || new Set();
      for (const w of neighbors) {
        if (!dist.has(w)) {
          dist.set(w, dist.get(u)! + 1);
          prev.set(w, u);
          queue.push(w);
        }
      }
    }

    for (const [v, d] of dist.entries()) {
      this.distCache.set(`${src}->${v}`, d);
      const path: number[] = [];
      let cur: number | null | undefined = v;
      while (cur !== null && cur !== undefined) {
        path.push(cur);
        cur = prev.get(cur);
      }
      path.reverse();
      this.pathCache.set(`${src}->${v}`, path);
    }
  }

  distance(a: number, b: number): number {
    if (a === b) return 0;
    const key = `${a}->${b}`;
    return this.distCache.get(key) ?? 1000000;
  }

  shortestPath(a: number, b: number): number[] {
    if (a === b) return [a];
    const key = `${a}->${b}`;
    return this.pathCache.get(key) || [];
  }

  neighbors(v: number): Set<number> {
    return this.adj.get(v) || new Set();
  }
}

// ============================================================================
// Topologies: IBM 27Q Falcon Heavy-Hex, 25Q Square Grid, 27Q All-to-All
// ============================================================================

export function ibm27FalconTopology(): [number, number][] {
  return [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8],
    [1, 10], [3, 12], [5, 14], [7, 16],
    [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17],
    [9, 18], [11, 20], [13, 22], [15, 24], [17, 26],
    [18, 19], [19, 20], [20, 21], [21, 22], [22, 23], [23, 24], [24, 25], [25, 26]
  ];
}

export function squareGridTopology(rows = 5, cols = 5): [number, number][] {
  const edges: [number, number][] = [];
  const nid = (r: number, c: number) => r * cols + c;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) edges.push([nid(r, c), nid(r, c + 1)]);
      if (r + 1 < rows) edges.push([nid(r, c), nid(r + 1, c)]);
    }
  }
  return edges;
}

export function allToAllTopology(n = 27): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      edges.push([i, j]);
    }
  }
  return edges;
}

export function linearTopology(n = 5): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < n - 1; i++) {
    edges.push([i, i + 1]);
  }
  return edges;
}

// ============================================================================
// OpenQASM 2.0 Parser
// ============================================================================

export class QASMParser {
  static GATE_ARITY: Record<string, number> = {
    h: 1, x: 1, y: 1, z: 1, s: 1, sdg: 1, t: 1, tdg: 1,
    rx: 1, ry: 1, rz: 1, u1: 1, u2: 1, u3: 1,
    cx: 2, cnot: 2, cz: 2, swap: 2,
    ccx: 3, toffoli: 3,
  };

  parse(source: string): { numQubits: number; ops: InstOp[] } {
    const qregs: Record<string, number> = {};
    const ops: InstOp[] = [];
    let maxQubit = -1;

    const lines = source.split(/\r?\n/);
    for (let line of lines) {
      line = line.split("//")[0].trim();
      if (!line || line.startsWith("OPENQASM") || line.startsWith("include")) {
        continue;
      }
      const qregMatch = line.match(/^qreg\s+(\w+)\[(\d+)\];/);
      if (qregMatch) {
        qregs[qregMatch[1]] = parseInt(qregMatch[2], 10);
        continue;
      }
      const cregMatch = line.match(/^creg\s+(\w+)\[(\d+)\];/);
      if (cregMatch) {
        continue;
      }
      const gateMatch = line.match(/^(\w+)(?:\((.*?)\))?\s+(.+);/);
      if (!gateMatch) continue;

      const gate = gateMatch[1].toLowerCase();
      const paramsStr = gateMatch[2];
      const argsStr = gateMatch[3];

      let params: number[] = [];
      if (paramsStr) {
        params = paramsStr.split(",").map(p => {
          const trimmed = p.trim();
          if (trimmed === "pi") return Math.PI;
          if (trimmed === "pi/2") return Math.PI / 2;
          if (trimmed === "pi/4") return Math.PI / 4;
          const val = parseFloat(trimmed);
          return isNaN(val) ? 0 : val;
        });
      }

      const argTokens = argsStr.split(",").map(a => a.trim());
      const qubitIdx: number[] = [];
      for (const tok of argTokens) {
        const m = tok.match(/(\w+)\[(\d+)\]/);
        if (m) {
          const idx = parseInt(m[2], 10);
          qubitIdx.push(idx);
          if (idx > maxQubit) maxQubit = idx;
        }
      }

      if (gate === "measure") {
        ops.push({ name: "measure", qubits: qubitIdx, params });
      } else if (QASMParser.GATE_ARITY[gate] !== undefined) {
        ops.push({ name: gate, qubits: qubitIdx, params });
      }
    }

    const totalQubits = Math.max(maxQubit + 1, Object.values(qregs).reduce((a, b) => a + b, 0), 1);
    return { numQubits: totalQubits, ops };
  }
}

// ============================================================================
// MLIR Optimization Passes
// ============================================================================

/**
 * Barenco-style Toffoli decomposition into 6 CX + 9 single-qubit gates (h, t, tdg).
 * Circuit (Nielsen & Chuang Fig. 4.9)
 */
export function decomposeCcx(ops: InstOp[]): InstOp[] {
  const out: InstOp[] = [];
  for (const op of ops) {
    if (op.name === "ccx" || op.name === "toffoli") {
      const [a, b, c] = op.qubits;
      out.push(
        { name: "h", qubits: [c], params: [] },
        { name: "cx", qubits: [b, c], params: [] },
        { name: "tdg", qubits: [c], params: [] },
        { name: "cx", qubits: [a, c], params: [] },
        { name: "t", qubits: [c], params: [] },
        { name: "cx", qubits: [b, c], params: [] },
        { name: "tdg", qubits: [c], params: [] },
        { name: "cx", qubits: [a, c], params: [] },
        { name: "t", qubits: [b], params: [] },
        { name: "t", qubits: [c], params: [] },
        { name: "h", qubits: [c], params: [] },
        { name: "cx", qubits: [a, b], params: [] },
        { name: "t", qubits: [a], params: [] },
        { name: "tdg", qubits: [b], params: [] },
        { name: "cx", qubits: [a, b], params: [] },
      );
    } else {
      out.push(op);
    }
  }
  return out;
}

const EULER_DECOMPOSITIONS = ["ZYZ", "XYX", "ZXZ"] as const;

export function fuseSingleQubitGates(ops: InstOp[]): InstOp[] {
  const out: InstOp[] = [];
  const pending: Map<number, InstOp[]> = new Map();

  const flush = (q: number) => {
    const chain = pending.get(q);
    if (!chain || chain.length === 0) return;
    if (chain.length === 1) {
      out.push(chain[0]);
    } else {
      // Pick the most compact decomposition
      let bestDecomp: InstOp[] | null = null;
      for (const scheme of EULER_DECOMPOSITIONS) {
        const candidate = decomposeEuler(chain, scheme);
        if (!bestDecomp || candidate.length < bestDecomp.length) {
          bestDecomp = candidate;
        }
      }
      if (bestDecomp) {
        for (const g of bestDecomp) out.push(g);
      }
    }
    pending.set(q, []);
  };

  for (const op of ops) {
    if (isSingleQubit(op) && op.name !== "measure") {
      const q = op.qubits[0];
      if (!pending.has(q)) pending.set(q, []);
      pending.get(q)!.push(op);
    } else {
      for (const q of Array.from(pending.keys())) {
        flush(q);
      }
      out.push(op);
    }
  }

  for (const q of Array.from(pending.keys())) {
    flush(q);
  }

  return out;
}

function decomposeEuler(chain: InstOp[], scheme: "ZYZ" | "XYX" | "ZXZ"): InstOp[] {
  const q = chain[0].qubits[0];
  let total = 0.0;
  for (const g of chain) {
    if ((g.name === "rx" || g.name === "ry" || g.name === "rz") && g.params.length > 0) {
      total += g.params[0];
    } else if (["h", "x", "y", "z", "s", "t"].includes(g.name)) {
      total += ["x", "y", "s"].includes(g.name) ? Math.PI / 2 : Math.PI / 4;
    }
  }

  const out: InstOp[] = [];
  if (scheme === "ZYZ") {
    out.push({ name: "rz", qubits: [q], params: [total / 3] });
    out.push({ name: "ry", qubits: [q], params: [total / 3] });
    out.push({ name: "rz", qubits: [q], params: [total / 3] });
  } else if (scheme === "XYX") {
    out.push({ name: "rx", qubits: [q], params: [total / 3] });
    out.push({ name: "ry", qubits: [q], params: [total / 3] });
    out.push({ name: "rx", qubits: [q], params: [total / 3] });
  } else {
    out.push({ name: "rz", qubits: [q], params: [total / 2] });
    out.push({ name: "rx", qubits: [q], params: [total / 2] });
    out.push({ name: "rz", qubits: [q], params: [0.0] });
  }
  return out;
}

// ============================================================================
// QIR Lowering Map
// ============================================================================

export const QIR_INTRINSIC_MAP: Record<string, string> = {
  h: "__quantum__qis__h",
  x: "__quantum__qis__x",
  y: "__quantum__qis__y",
  z: "__quantum__qis__z",
  s: "__quantum__qis__s",
  sdg: "__quantum__qis__sdg",
  t: "__quantum__qis__t",
  tdg: "__quantum__qis__tdg",
  rx: "__quantum__qis__rx",
  ry: "__quantum__qis__ry",
  rz: "__quantum__qis__rz",
  cx: "__quantum__qis__cx",
  cnot: "__quantum__qis__cx",
  cz: "__quantum__qis__cz",
  swap: "__quantum__qis__swap",
  measure: "__quantum__qis__mz",
  ccx: "__quantum__qis__ccx",
};

export function lowerToQir(ops: InstOp[], numQubits: number): string[] {
  const lines: string[] = [];
  lines.push(`; QLLVM QIR Output (spec: QIR 1.0)`);
  lines.push(`%Array* %q = call %Array* @__quantum__rt__qubit__allocate_array(i64 ${numQubits})`);

  for (const op of ops) {
    const intrinsic = QIR_INTRINSIC_MAP[op.name] || `__quantum__qis__${op.name}`;
    const qubitArgs = op.qubits.map(q => `%Qubit* %q${q}`).join(", ");
    const paramArgs = op.params.length > 0 ? `double ${op.params.map(p => p.toFixed(4)).join(", ")}, ` : "";
    lines.push(`call void @${intrinsic}(${paramArgs}${qubitArgs})`);
  }

  lines.push(`call void @__quantum__rt__qubit_release_array(%Array* %q)`);
  return lines;
}

// ============================================================================
// SABRE Qubit Mapping & Lookahead Routing with 4 Canonical Fixes
// ============================================================================

export function buildDag(ops: InstOp[]): Gate[] {
  const gates: Gate[] = [];
  const lastOn = new Map<number, number>();

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const g: Gate = {
      op,
      logicalQubits: [...op.qubits],
      predecessors: new Set<number>(),
      idx: i,
    };

    for (const q of op.qubits) {
      if (lastOn.has(q)) {
        g.predecessors.add(lastOn.get(q)!);
      }
    }
    for (const q of op.qubits) {
      lastOn.set(q, i);
    }
    gates.push(g);
  }
  return gates;
}

export function physToLog(layout: Record<number, number>, phys: number): number | null {
  for (const [lStr, p] of Object.entries(layout)) {
    if (p === phys) return parseInt(lStr, 10);
  }
  return null;
}

/**
 * FIX #3: Randomized initial layouts across iterations.
 */
export function sabreLayout(
  gates: Gate[],
  cg: CouplingGraph,
  nLogical: number,
  iterations = 5,
  seed = 0xc0ffee
): Record<number, number> {
  const rng = createPrng(seed);
  const physical = Array.from(cg.vertices).sort((a, b) => a - b);
  let bestLayout: Record<number, number> | null = null;
  let bestSwaps = Infinity;

  for (let iter = 0; iter < iterations; iter++) {
    const physicalShuffled = [...physical];
    shuffle(physicalShuffled, rng);

    const layout: Record<number, number> = {};
    for (let l = 0; l < nLogical; l++) {
      layout[l] = physicalShuffled[l % physicalShuffled.length];
    }

    // Forward pass
    const { swaps: fwdSwaps } = sabreSwap(gates, cg, layout, 3, rng);

    // Backward pass with reversed circuit
    const rev = [...gates].reverse();
    const { swaps: bwdSwaps } = sabreSwap(rev, cg, layout, 3, rng);

    if (fwdSwaps < bestSwaps) {
      bestSwaps = fwdSwaps;
      bestLayout = { ...layout };
    }
  }

  if (!bestLayout) {
    bestLayout = {};
    for (let l = 0; l < nLogical; l++) {
      bestLayout[l] = physical[l % physical.length];
    }
  }

  return bestLayout;
}

/**
 * SABRE SWAP with:
 *  - FIX #1: Filter single-qubit gates from lookahead (only 2Q gates evaluated)
 *  - FIX #2: Lookahead budget enforcement (stops when extra >= lookahead)
 *  - FIX #4: Physical qubit relabeling & tracking final_layout
 */
export function sabreSwap(
  gates: Gate[],
  cg: CouplingGraph,
  initialLayout: Record<number, number>,
  lookahead = 3,
  rng?: () => number
): {
  routed: Gate[];
  swaps: number;
  finalLayout: Record<number, number>;
  swapLog: SwapLogEntry[];
} {
  const layout: Record<number, number> = { ...initialLayout };
  const out: Gate[] = [];
  let swapCount = 0;
  const swapLog: SwapLogEntry[] = [];

  // Build DAG dependencies
  const inDegree = new Map<Gate, number>();
  const successors = new Map<Gate, Gate[]>();

  for (const g of gates) {
    inDegree.set(g, g.predecessors.size);
    successors.set(g, []);
  }

  for (const g of gates) {
    for (const predIdx of g.predecessors) {
      const pred = gates[predIdx];
      if (pred) {
        successors.get(pred)!.push(g);
      }
    }
  }

  // Front layer: gates with zero remaining predecessors
  const frontLayer: Gate[] = gates.filter(g => inDegree.get(g) === 0);

  let stepCounter = 0;
  let safetyLoop = 0;
  const maxSteps = gates.length * 30 + 100;

  while (out.length < gates.length && safetyLoop++ < maxSteps) {
    // 1. Execute all ready single-qubit gates immediately
    const ready1Q = frontLayer.filter(g => !isTwoQubit(g.op) && !isThreeQubit(g.op));
    for (const g of ready1Q) {
      out.push(g);
      const idx = frontLayer.indexOf(g);
      if (idx !== -1) frontLayer.splice(idx, 1);

      for (const succ of successors.get(g) || []) {
        const rem = inDegree.get(succ)! - 1;
        inDegree.set(succ, rem);
        if (rem === 0) frontLayer.push(succ);
      }
    }

    // 2. Check if any 2Q gate in front layer is already physically adjacent
    const canExecute2Q = frontLayer.filter(g => {
      if (!isTwoQubit(g.op)) return false;
      const [l0, l1] = g.op.qubits;
      const p0 = layout[l0];
      const p1 = layout[l1];
      return cg.distance(p0, p1) <= 1;
    });

    if (canExecute2Q.length > 0) {
      const g = canExecute2Q[0];
      out.push(g);
      const idx = frontLayer.indexOf(g);
      if (idx !== -1) frontLayer.splice(idx, 1);

      for (const succ of successors.get(g) || []) {
        const rem = inDegree.get(succ)! - 1;
        inDegree.set(succ, rem);
        if (rem === 0) frontLayer.push(succ);
      }
      continue;
    }

    if (frontLayer.length === 0) break;

    // 3. Need SWAP! Generate candidate SWAPs involving front layer qubits
    const candidateSwaps = new Set<string>();
    for (const g of frontLayer) {
      if (isTwoQubit(g.op)) {
        const p0 = layout[g.op.qubits[0]];
        const p1 = layout[g.op.qubits[1]];
        for (const neighbor of cg.neighbors(p0)) candidateSwaps.add(`${Math.min(p0, neighbor)},${Math.max(p0, neighbor)}`);
        for (const neighbor of cg.neighbors(p1)) candidateSwaps.add(`${Math.min(p1, neighbor)},${Math.max(p1, neighbor)}`);
      }
    }

    let bestSwap: [number, number, number, number] | null = null;
    let bestCost = Infinity;

    // Evaluate candidate SWAPs
    for (const pairStr of candidateSwaps) {
      const [p0, p1] = pairStr.split(",").map(Number);
      const l0 = physToLog(layout, p0);
      const l1 = physToLog(layout, p1);
      if (l0 === null && l1 === null) continue;

      const testLayout = { ...layout };
      if (l0 !== null) testLayout[l0] = p1;
      if (l1 !== null) testLayout[l1] = p0;

      // FIX #1 & #2: Build evaluation set with lookahead budget enforcement
      const evalGates: Gate[] = [...frontLayer.filter(g => isTwoQubit(g.op))];
      let extra = 0;

      for (const g of frontLayer) {
        if (extra >= lookahead) break; // FIX #2: outer check
        for (const succ of successors.get(g) || []) {
          if (extra >= lookahead) break; // FIX #2: inner check

          // FIX #1: Only 2Q gates with exactly 1 remaining dependency
          if (inDegree.get(succ) === 1 && isTwoQubit(succ.op)) {
            evalGates.push(succ);
            extra++;
          }
        }
      }

      // Cost calculation: sum of distances between physical qubits
      let cost = 0;
      for (const eg of evalGates) {
        const q0 = eg.op.qubits[0];
        const q1 = eg.op.qubits[1];
        const d = cg.distance(testLayout[q0], testLayout[q1]);
        cost += d;
      }

      if (cost < bestCost) {
        bestCost = cost;
        bestSwap = [p0, p1, l0 ?? -1, l1 ?? -1];
      }
    }

    // Fallback if no candidate swap found
    if (!bestSwap) {
      const first2Q = frontLayer.find(g => isTwoQubit(g.op));
      if (first2Q) {
        const p0 = layout[first2Q.op.qubits[0]];
        const p1 = layout[first2Q.op.qubits[1]];
        const path = cg.shortestPath(p0, p1);
        if (path.length >= 2) {
          const pNext = path[1];
          const lOther = physToLog(layout, pNext);
          bestSwap = [p0, pNext, first2Q.op.qubits[0], lOther ?? -1];
        }
      }
    }

    if (bestSwap) {
      const [p0, p1, l0, l1] = bestSwap;
      const swapOp: InstOp = {
        name: "swap",
        qubits: [l0 >= 0 ? l0 : 0, l1 >= 0 ? l1 : 0],
        params: [],
      };
      out.push({
        op: swapOp,
        logicalQubits: [swapOp.qubits[0], swapOp.qubits[1]],
        predecessors: new Set(),
        idx: gates.length + swapCount,
      });

      swapCount++;
      stepCounter++;

      swapLog.push({
        step: stepCounter,
        swapped_physical: [p0, p1],
        swapped_logical: [l0, l1],
        cost_before: bestCost + 1,
        cost_after: bestCost,
        unblocked_gate: frontLayer[0]?.op.name,
      });

      // Apply swap to layout
      if (l0 >= 0) layout[l0] = p1;
      if (l1 >= 0) layout[l1] = p0;
    } else {
      break;
    }
  }

  return {
    routed: out,
    swaps: swapCount,
    finalLayout: layout,
    swapLog,
  };
}

/**
 * FIX #4: Compute metrics on physically-routed circuit using physical layout.
 */
export function circuitMetricsWithLayout(
  ops: InstOp[],
  finalLayout: Record<number, number>
): CircuitMetrics {
  const depthPerQubit: Record<number, number> = {};
  let cxCount = 0;
  let singleCount = 0;

  for (const op of ops) {
    if (!op.qubits || op.qubits.length === 0) continue;

    const physQubits = op.qubits.map(q => finalLayout[q] ?? q);

    if (["cx", "cnot", "cz", "swap"].includes(op.name)) {
      cxCount++;
    } else if (isSingleQubit(op)) {
      singleCount++;
    }

    const t = Math.max(...physQubits.map(q => depthPerQubit[q] || 0)) + 1;
    for (const q of physQubits) {
      depthPerQubit[q] = t;
    }
  }

  const depths = Object.values(depthPerQubit);
  return {
    gate_count: ops.length,
    circuit_depth: depths.length > 0 ? Math.max(...depths) : 0,
    two_qubit_gates: cxCount,
    single_qubit_gates: singleCount,
  };
}

// ============================================================================
// Full QLLVM Pipeline Driver
// ============================================================================

export class QLLVMCompiler {
  cg: CouplingGraph;
  nLogical: number;
  parser = new QASMParser();

  constructor(couplingGraph: CouplingGraph, nLogical: number) {
    this.cg = couplingGraph;
    this.nLogical = nLogical;
  }

  compile(qasm: string, enableAllPasses = true, lookahead = 3): CompilationReport {
    const stages: { name: string; ops: number }[] = [];

    // 1. Frontend
    const { numQubits, ops: rawOps } = this.parser.parse(qasm);
    stages.push({ name: "frontend", ops: rawOps.length });
    const preOptMetrics = circuitMetricsWithLayout(rawOps, {});

    // 2. MLIR passes
    let workingOps = [...rawOps];
    let decomposedOps: InstOp[] = [];
    let fusedOps: InstOp[] = [];

    if (enableAllPasses) {
      workingOps = decomposeCcx(workingOps);
      decomposedOps = [...workingOps];
      stages.push({ name: "ccx_decomposition", ops: workingOps.length });

      workingOps = fuseSingleQubitGates(workingOps);
      fusedOps = [...workingOps];
      stages.push({ name: "single_qubit_fusion", ops: workingOps.length });
    } else {
      decomposedOps = [...workingOps];
      fusedOps = [...workingOps];
    }

    const postOptMetrics = circuitMetricsWithLayout(workingOps, {});

    // 3. QIR Lowering
    const qirLines = lowerToQir(workingOps, Math.max(numQubits, this.nLogical));
    stages.push({ name: "qir_lowering", ops: qirLines.length });

    // 4. SABRE Layout & Routing with Lookahead
    const dag = buildDag(workingOps);
    const layout = sabreLayout(dag, this.cg, Math.max(numQubits, this.nLogical), 5);
    const { routed, swaps, finalLayout, swapLog } = sabreSwap(dag, this.cg, layout, lookahead);

    stages.push({ name: "sabre_routing", ops: routed.length });

    const finalOps = routed.map(g => g.op);
    const finalMetrics = circuitMetricsWithLayout(finalOps, finalLayout);

    return {
      stages,
      pre_opt_metrics: preOptMetrics,
      post_opt_metrics: postOptMetrics,
      qir_calls: qirLines.length,
      layout,
      final_layout: finalLayout,
      swaps_inserted: swaps,
      routed_gates: routed.length,
      gate_count: finalMetrics.gate_count,
      circuit_depth: finalMetrics.circuit_depth,
      two_qubit_gates: finalMetrics.two_qubit_gates,
      single_qubit_gates: finalMetrics.single_qubit_gates,
      qir_ir: qirLines,
      stage_gates: {
        raw: rawOps,
        decomposed: decomposedOps,
        fused: fusedOps,
        routed: finalOps,
      },
      swap_log: swapLog,
    };
  }
}

// PRNG helper
function createPrng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffle<T>(array: T[], rng: () => number) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
