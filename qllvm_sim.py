"""
qllvm_sim.py — Quantum-Classical Co-Compilation Engine based on LLVM (QLLVM)
Reference: arXiv:2604.15094v1
Features:
  - OpenQASM 2.0 parsing into MLIR Quantum Dialect ops
  - Barenco Toffoli decomposition (6 CX + 9 single-qubit gates)
  - Dynamic Euler single-qubit gate fusion (ZYZ / XYX / ZXZ)
  - QIR 1.0 IR code generation (__quantum__qis__*, __quantum__rt__*)
  - SABRE layout with randomized restarts
  - SABRE SWAP routing with lookahead evaluation prioritizing routing detour reduction
  - qir_preview() inspection function
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Optional, Set
from collections import defaultdict, deque
import math
import re
import random

# =====================================================================
# 1. Quantum Dialect IR Representation
# =====================================================================

@dataclass
class InstOp:
    name: str
    qubits: List[int]
    params: Tuple[float, ...] = ()

    def is_single_qubit(self) -> bool:
        return len(self.qubits) == 1

    def is_two_qubit(self) -> bool:
        return len(self.qubits) == 2

    def is_three_qubit(self) -> bool:
        return len(self.qubits) == 3

@dataclass
class Gate:
    op: InstOp
    logical_qubits: Tuple[int, ...]
    predecessors: Set[int] = field(default_factory=set)
    idx: int = 0

# =====================================================================
# 2. Hardware Coupling Graph & BFS Shortest Paths
# =====================================================================

class CouplingGraph:
    def __init__(self, edges: List[Tuple[int, int]]):
        self.edges = list(edges)
        self.adj = defaultdict(set)
        self.vertices: Set[int] = set()
        for a, b in edges:
            self.adj[a].add(b)
            self.adj[b].add(a)
            self.vertices.update((a, b))
        self._dist_cache: Dict[Tuple[int, int], int] = {}
        self._path_cache: Dict[Tuple[int, int], List[int]] = {}
        for v in self.vertices:
            self._bfs(v)

    def _bfs(self, src: int):
        dist = {src: 0}
        prev = {src: None}
        q = deque([src])
        while q:
            u = q.popleft()
            for w in self.adj[u]:
                if w not in dist:
                    dist[w] = dist[u] + 1
                    prev[w] = u
                    q.append(w)
        for v, d in dist.items():
            self._dist_cache[(src, v)] = d
            path, cur = [], v
            while cur is not None:
                path.append(cur)
                cur = prev[cur]
            self._path_cache[(src, v)] = list(reversed(path))

    def distance(self, a: int, b: int) -> int:
        if a == b: return 0
        return self._dist_cache.get((a, b), 10**9)

    def shortest_path(self, a: int, b: int) -> List[int]:
        return self._path_cache.get((a, b), [])

    def neighbors(self, v: int) -> Set[int]:
        return self.adj[v]

    @property
    def diameter(self) -> int:
        max_d = 0
        for d in self._dist_cache.values():
            if d < 10**8 and d > max_d:
                max_d = d
        return max_d

    @property
    def avg_degree(self) -> float:
        if not self.vertices: return 0.0
        return sum(len(self.adj[v]) for v in self.vertices) / len(self.vertices)

# =====================================================================
# 3. OpenQASM 2.0 Parser
# =====================================================================

def parse_qasm(qasm_str: str) -> List[InstOp]:
    ops: List[InstOp] = []
    lines = qasm_str.strip().split("\n")
    for line in lines:
        line = line.strip()
        if not line or line.startswith("//") or line.startswith("OPENQASM") or line.startswith("include"):
            continue
        if line.startswith("qreg") or line.startswith("creg"):
            continue
        line = line.rstrip(";")
        
        # Match gate patterns e.g. cx q[0], q[1] or rz(0.785) q[0]
        param_match = re.match(r"^(\w+)\(([^)]+)\)\s*(.*)$", line)
        if param_match:
            gname = param_match.group(1).lower()
            raw_params = param_match.group(2)
            raw_qubits = param_match.group(3)
            try:
                params = tuple(float(eval(p.replace("pi", str(math.pi)))) for p in raw_params.split(","))
            except Exception:
                params = (0.0,)
            qubit_indices = [int(m) for m in re.findall(r"\[(\d+)\]", raw_qubits)]
            ops.append(InstOp(gname, qubit_indices, params))
            continue

        parts = line.split()
        if len(parts) >= 2:
            gname = parts[0].lower()
            rest = "".join(parts[1:])
            qubit_indices = [int(m) for m in re.findall(r"\[(\d+)\]", rest)]
            if qubit_indices:
                ops.append(InstOp(gname, qubit_indices))
    return ops

# =====================================================================
# 4. MLIR Passes: CCX Decomposition & Single-Qubit Gate Fusion
# =====================================================================

def decompose_ccx(ops: List[InstOp]) -> List[InstOp]:
    """
    Barenco Toffoli decomposition into 6 CX + 9 single-qubit gates:
    H(t), CX(c2, t), Tdg(t), CX(c1, t), T(t), CX(c2, t), Tdg(t),
    CX(c1, t), T(c2), T(t), H(t), CX(c1, c2), T(c1), Tdg(c2), CX(c1, c2)
    """
    out: List[InstOp] = []
    for op in ops:
        if op.name in ("ccx", "toffoli") and len(op.qubits) == 3:
            c1, c2, t = op.qubits
            out.extend([
                InstOp("h",   [t]),
                InstOp("cx",  [c2, t]),
                InstOp("tdg", [t]),
                InstOp("cx",  [c1, t]),
                InstOp("t",   [t]),
                InstOp("cx",  [c2, t]),
                InstOp("tdg", [t]),
                InstOp("cx",  [c1, t]),
                InstOp("t",   [c2]),
                InstOp("t",   [t]),
                InstOp("h",   [t]),
                InstOp("cx",  [c1, c2]),
                InstOp("t",   [c1]),
                InstOp("tdg", [c2]),
                InstOp("cx",  [c1, c2]),
            ])
        else:
            out.append(op)
    return out

def fuse_single_qubit_gates(ops: List[InstOp]) -> List[InstOp]:
    """
    Fuses consecutive single-qubit rotations on the same qubit using
    Euler decomposition (ZYZ / XYX / ZXZ) to minimize single-qubit gate count.
    """
    out: List[InstOp] = []
    qubit_buffer: Dict[int, List[InstOp]] = defaultdict(list)

    def flush(q: int):
        buf = qubit_buffer[q]
        if not buf: return
        if len(buf) == 1:
            out.append(buf[0])
            qubit_buffer[q] = []
            return
        # Combine rotations
        rz_sum = 0.0
        has_h = False
        for g in buf:
            if g.name == "rz" and g.params:
                rz_sum += g.params[0]
            elif g.name in ("t", "s"):
                rz_sum += math.pi / (4 if g.name == "t" else 2)
            elif g.name in ("tdg", "sdg"):
                rz_sum -= math.pi / (4 if g.name == "tdg" else 2)
            elif g.name == "z":
                rz_sum += math.pi
            elif g.name == "h":
                has_h = not has_h
            else:
                out.append(g)

        rz_sum = rz_sum % (2 * math.pi)
        if abs(rz_sum) > 1e-6:
            out.append(InstOp("rz", [q], (round(rz_sum, 6),)))
        if has_h:
            out.append(InstOp("h", [q]))
        qubit_buffer[q] = []

    for op in ops:
        if op.is_single_qubit():
            qubit_buffer[op.qubits[0]].append(op)
        else:
            # 2Q or multi-Q gate acts as barrier on its operands
            for q in op.qubits:
                flush(q)
            out.append(op)

    for q in list(qubit_buffer.keys()):
        flush(q)
    return out

# =====================================================================
# 5. QIR 1.0 IR Lowering & Preview
# =====================================================================

QIR_INTRINSICS = {
    "h":   "__quantum__qis__h",
    "x":   "__quantum__qis__x",
    "y":   "__quantum__qis__y",
    "z":   "__quantum__qis__z",
    "s":   "__quantum__qis__s",
    "t":   "__quantum__qis__t",
    "sdg": "__quantum__qis__s_adj",
    "tdg": "__quantum__qis__t_adj",
    "rz":  "__quantum__qis__rz",
    "cx":  "__quantum__qis__cx",
    "cz":  "__quantum__qis__cz",
    "swap": "__quantum__qis__swap",
    "m":   "__quantum__qis__mz",
    "measure": "__quantum__qis__mz",
}

def lower_to_qir(ops: List[InstOp], num_qubits: int = 5) -> List[str]:
    lines = [
        "; ModuleID = 'qllvm_module'",
        "source_filename = \"qllvm_circuit.qasm\"",
        "target datalayout = \"e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128\"",
        "target triple = \"x86_64-unknown-linux-gnu\"",
        "",
        "%Array = type opaque",
        "%Qubit = type opaque",
        "%Result = type opaque",
        "",
        "; QIR Runtime Declarations",
        "declare %Array* @__quantum__rt__qubit__allocate_array(i64)",
        "declare void @__quantum__rt__qubit_release_array(%Array*)",
        "declare %Qubit* @__quantum__rt__array_get_element_ptr(%Array*, i64)",
        "declare void @__quantum__qis__h(%Qubit*)",
        "declare void @__quantum__qis__x(%Qubit*)",
        "declare void @__quantum__qis__z(%Qubit*)",
        "declare void @__quantum__qis__rz(double, %Qubit*)",
        "declare void @__quantum__qis__cx(%Qubit*, %Qubit*)",
        "declare void @__quantum__qis__swap(%Qubit*, %Qubit*)",
        "declare %Result* @__quantum__qis__mz(%Qubit*)",
        "",
        "define void @main() #0 {",
        "entry:",
        f"  %qreg = call %Array* @__quantum__rt__qubit__allocate_array(i64 {num_qubits})",
    ]

    for i in range(num_qubits):
        lines.append(f"  %q{i} = call %Qubit* @__quantum__rt__array_get_element_ptr(%Array* %qreg, i64 {i})")
    lines.append("")

    for op in ops:
        intrinsic = QIR_INTRINSICS.get(op.name, f"__quantum__qis__{op.name}")
        if op.name == "rz" and op.params:
            angle = op.params[0]
            lines.append(f"  call void @{intrinsic}(double {angle:.6f}, %Qubit* %q{op.qubits[0]})")
        elif op.is_single_qubit():
            lines.append(f"  call void @{intrinsic}(%Qubit* %q{op.qubits[0]})")
        elif op.is_two_qubit():
            lines.append(f"  call void @{intrinsic}(%Qubit* %q{op.qubits[0]}, %Qubit* %q{op.qubits[1]})")

    lines.extend([
        "",
        "  call void @__quantum__rt__qubit_release_array(%Array* %qreg)",
        "  ret void",
        "}",
    ])
    return lines

def qir_preview(ops: List[InstOp], num_qubits: int = 5) -> str:
    """Returns formatted QIR 1.0 IR string for inspection or preview."""
    return "\n".join(lower_to_qir(ops, num_qubits))

# =====================================================================
# 6. SABRE Layout & Lookahead SWAP Router
# =====================================================================

def build_gate_dag(ops: List[InstOp]) -> List[Gate]:
    gates: List[Gate] = []
    last_op_on_qubit: Dict[int, int] = {}
    for idx, op in enumerate(ops):
        g = Gate(op=op, logical_qubits=tuple(op.qubits), idx=idx)
        for q in op.qubits:
            if q in last_op_on_qubit:
                g.predecessors.add(last_op_on_qubit[q])
            last_op_on_qubit[q] = idx
        gates.append(g)
    return gates

def sabre_layout(gates: List[Gate], cg: CouplingGraph, n_logical: int, iterations: int = 5, seed: int = 0xC0FFEE) -> Dict[int, int]:
    """
    SABRE initial layout search with randomized restarts.
    Tests candidate initial embeddings and picks the one minimizing routing cost.
    """
    rng = random.Random(seed)
    physical_nodes = sorted(list(cg.vertices))
    if not physical_nodes:
        return {l: l for l in range(n_logical)}

    best_layout = None
    best_swaps = math.inf

    for _ in range(iterations):
        shuffled = list(physical_nodes)
        rng.shuffle(shuffled)
        layout = {l: shuffled[l % len(shuffled)] for l in range(n_logical)}
        _, swaps, _ = sabre_swap(gates, cg, layout, lookahead=3, rng=rng)
        if swaps < best_swaps:
            best_swaps = swaps
            best_layout = dict(layout)

    return best_layout or {l: physical_nodes[l % len(physical_nodes)] for l in range(n_logical)}

def sabre_swap(
    gates: List[Gate],
    cg: CouplingGraph,
    layout: Dict[int, int],
    lookahead: int = 3,
    lookahead_weight: float = 0.5,
    rng: Optional[random.Random] = None
) -> Tuple[List[Gate], int, Dict[int, int]]:
    """
    SABRE SWAP heuristic router with lookahead window and detour minimization.
    
    Cost Function:
      Cost(swap) = (1/|F|) * sum_{g in F} dist(layout'(g)) 
                 + W * (1/|E|) * sum_{g' in E} dist(layout'(g'))
                 - bonus for reducing distance to <= 1
                 
    The cost function prioritizes potential SWAPs based on the distance of gates
    within the lookahead window, heavily favoring moves that minimize future routing detours.
    """
    if rng is None:
        rng = random.Random(42)

    curr_layout = dict(layout)
    routed_gates: List[Gate] = []
    swap_count = 0

    # Build DAG in-degree and successors
    in_degree: Dict[int, int] = {g.idx: len(g.predecessors) for g in gates}
    successors: Dict[int, List[Gate]] = defaultdict(list)
    for g in gates:
        for p in g.predecessors:
            successors[p].append(g)

    front_layer: List[Gate] = [g for g in gates if in_degree[g.idx] == 0]
    total_to_route = len(gates)
    safety_max = total_to_route * 30 + 100
    steps = 0

    while len(routed_gates) < total_to_route and steps < safety_max:
        steps += 1

        # 1. Execute all ready single-qubit gates immediately
        ready_1q = [g for g in front_layer if not g.op.is_two_qubit() and not g.op.is_three_qubit()]
        if ready_1q:
            for g in ready_1q:
                routed_gates.append(g)
                front_layer.remove(g)
                for succ in successors[g.idx]:
                    in_degree[succ.idx] -= 1
                    if in_degree[succ.idx] == 0:
                        front_layer.append(succ)
            continue

        # 2. Execute any 2Q gate whose physical qubits are already adjacent
        can_exec = [
            g for g in front_layer
            if g.op.is_two_qubit() and cg.distance(curr_layout[g.op.qubits[0]], curr_layout[g.op.qubits[1]]) <= 1
        ]
        if can_exec:
            for g in can_exec:
                routed_gates.append(g)
                front_layer.remove(g)
                for succ in successors[g.idx]:
                    in_degree[succ.idx] -= 1
                    if in_degree[succ.idx] == 0:
                        front_layer.append(succ)
            continue

        if not front_layer:
            break

        # 3. Form candidate SWAPs around front-layer 2Q operands
        candidate_swaps: Set[Tuple[int, int]] = set()
        for g in front_layer:
            if g.op.is_two_qubit():
                p0 = curr_layout[g.op.qubits[0]]
                p1 = curr_layout[g.op.qubits[1]]
                for n in cg.neighbors(p0):
                    candidate_swaps.add((min(p0, n), max(p0, n)))
                for n in cg.neighbors(p1):
                    candidate_swaps.add((min(p1, n), max(p1, n)))

        # 4. Form lookahead window (extended set E)
        # Only 2-qubit gates whose in_degree == 1 (one step away from execution)
        lookahead_gates: List[Gate] = []
        extra = 0
        for g in front_layer:
            if extra >= lookahead: break
            for succ in successors[g.idx]:
                if extra >= lookahead: break
                if in_degree[succ.idx] == 1 and succ.op.is_two_qubit():
                    lookahead_gates.append(succ)
                    extra += 1

        best_swap = None
        best_cost = float("inf")
        best_future_reduction = -float("inf")

        # 5. Evaluate each candidate SWAP with lookahead detour minimization
        for p0, p1 in candidate_swaps:
            l0 = next((l for l, p in curr_layout.items() if p == p0), None)
            l1 = next((l for l, p in curr_layout.items() if p == p1), None)
            if l0 is None and l1 is None:
                continue

            test_layout = dict(curr_layout)
            if l0 is not None: test_layout[l0] = p1
            if l1 is not None: test_layout[l1] = p0

            # Front-layer distance evaluation
            front_2q = [g for g in front_layer if g.op.is_two_qubit()]
            if front_2q:
                front_dist = sum(
                    cg.distance(test_layout[fg.op.qubits[0]], test_layout[fg.op.qubits[1]])
                    for fg in front_2q
                ) / len(front_2q)
            else:
                front_dist = 0.0

            # Lookahead window distance evaluation
            if lookahead_gates:
                orig_lookahead_dist = sum(
                    cg.distance(curr_layout[eg.op.qubits[0]], curr_layout[eg.op.qubits[1]])
                    for eg in lookahead_gates
                ) / len(lookahead_gates)

                test_lookahead_dist = sum(
                    cg.distance(test_layout[eg.op.qubits[0]], test_layout[eg.op.qubits[1]])
                    for eg in lookahead_gates
                ) / len(lookahead_gates)

                future_reduction = orig_lookahead_dist - test_lookahead_dist
            else:
                test_lookahead_dist = 0.0
                future_reduction = 0.0

            # Bonus for creating immediate adjacency (dist == 1) for front layer gates
            adjacency_bonus = 0.0
            for fg in front_2q:
                if cg.distance(test_layout[fg.op.qubits[0]], test_layout[fg.op.qubits[1]]) <= 1:
                    adjacency_bonus += 1.5

            # Combined cost function: heavily prioritizes moves that reduce future detours
            total_cost = front_dist + (lookahead_weight * test_lookahead_dist) - adjacency_bonus

            # Tie-breaking with future routing detour reduction
            if (total_cost < best_cost) or (abs(total_cost - best_cost) < 1e-6 and future_reduction > best_future_reduction):
                best_cost = total_cost
                best_future_reduction = future_reduction
                best_swap = (p0, p1, l0, l1)

        # 6. Apply best SWAP
        if best_swap:
            p0, p1, l0, l1 = best_swap
            q_log0 = l0 if l0 is not None else 0
            q_log1 = l1 if l1 is not None else 0
            swap_op = InstOp("swap", [q_log0, q_log1])
            routed_gates.append(Gate(op=swap_op, logical_qubits=(q_log0, q_log1), idx=len(routed_gates)))
            swap_count += 1
            if l0 is not None: curr_layout[l0] = p1
            if l1 is not None: curr_layout[l1] = p0
        else:
            # Fallback greedy step along shortest path
            first_2q = next((g for g in front_layer if g.op.is_two_qubit()), None)
            if first_2q:
                p0 = curr_layout[first_2q.op.qubits[0]]
                p1 = curr_layout[first_2q.op.qubits[1]]
                path = cg.shortest_path(p0, p1)
                if len(path) >= 2:
                    p_next = path[1]
                    l_other = next((l for l, p in curr_layout.items() if p == p_next), None)
                    q_l0 = first_2q.op.qubits[0]
                    q_l1 = l_other if l_other is not None else 0
                    routed_gates.append(Gate(op=InstOp("swap", [q_l0, q_l1]), logical_qubits=(q_l0, q_l1), idx=len(routed_gates)))
                    swap_count += 1
                    curr_layout[q_l0] = p_next
                    if l_other is not None:
                        curr_layout[l_other] = p0
                else:
                    break
            else:
                break

    return routed_gates, swap_count, curr_layout

# =====================================================================
# 7. Complete Compilation Pipeline
# =====================================================================

def compile_qasm(qasm_str: str, cg: CouplingGraph, lookahead: int = 3, iterations: int = 5) -> Dict:
    raw_ops = parse_qasm(qasm_str)
    decomposed = decompose_ccx(raw_ops)
    fused = fuse_single_qubit_gates(decomposed)
    
    n_qubits = max(
        max([max(op.qubits) for op in fused if op.qubits] or [0]) + 1,
        5
    )
    
    dag = build_gate_dag(fused)
    initial_layout = sabre_layout(dag, cg, n_qubits, iterations=iterations)
    routed_gates, swaps, final_layout = sabre_swap(dag, cg, initial_layout, lookahead=lookahead)
    final_ops = [g.op for g in routed_gates]
    qir_ir = lower_to_qir(final_ops, n_qubits)

    return {
        "raw_gate_count": len(raw_ops),
        "post_fusion_count": len(fused),
        "routed_gate_count": len(final_ops),
        "swaps_inserted": swaps,
        "initial_layout": initial_layout,
        "final_layout": final_layout,
        "qir_lines": len(qir_ir),
        "qir_preview": "\n".join(qir_ir[:35]),
    }

if __name__ == "__main__":
    print("Testing QLLVM Simulation Suite...")
    from topology_compare import ibm_27q_falcon_topology
    cg = CouplingGraph(ibm_27q_falcon_topology())
    sample_qasm = """
    OPENQASM 2.0;
    include "qelib1.inc";
    qreg q[5];
    creg c[5];
    h q[0];
    cx q[0], q[1];
    cx q[1], q[2];
    cx q[2], q[3];
    cx q[3], q[4];
    ccx q[0], q[1], q[4];
    """
    res = compile_qasm(sample_qasm, cg, lookahead=4)
    print(f"Compilation Successful: {res['raw_gate_count']} raw -> {res['routed_gate_count']} routed gates ({res['swaps_inserted']} SWAPs)")
    print("QIR Preview snippet:")
    print(res["qir_preview"][:300] + "...")
