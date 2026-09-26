"""
topology_compare.py — Hardware topology comparison for QLLVM SABRE routing.
Reference: arXiv:2604.15094v1, MQTBench benchmarks
Topologies:
  - IBM Falcon 27Q Heavy-Hex (Degree 2-3, Diameter 11)
  - 2D Square Lattice 25Q (Degree 2-4, Diameter 8)
  - Trapped-Ion Complete Graph 27Q (Degree 26, Diameter 1)
"""

from typing import List, Tuple, Dict
from qllvm_sim import CouplingGraph, compile_qasm

# =====================================================================
# 1. Topology Generators
# =====================================================================

def ibm_27q_falcon_topology() -> List[Tuple[int, int]]:
    """
    IBM Falcon 27-qubit Heavy-Hex topology.
    Qubit connectivity layout:
      Row 0 (horizontal): 0-1-2-3-4-5-6-7-8
      Vertical couplers: (1,10), (3,12), (5,14), (7,16)
      Row 1 (horizontal): 9-10-11-12-13-14-15-16-17
      Vertical couplers: (9,18), (11,20), (13,22), (15,24), (17,26)
      Row 2 (horizontal): 18-19-20-21-22-23-24-25-26
    """
    return [
        (0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7), (7, 8),
        (1, 10), (3, 12), (5, 14), (7, 16),
        (9, 10), (10, 11), (11, 12), (12, 13), (13, 14), (14, 15), (15, 16), (16, 17),
        (9, 18), (11, 20), (13, 22), (15, 24), (17, 26),
        (18, 19), (19, 20), (20, 21), (21, 22), (22, 23), (23, 24), (24, 25), (25, 26)
    ]

def square_grid_topology(rows: int = 5, cols: int = 5) -> List[Tuple[int, int]]:
    """2D nearest-neighbor Cartesian grid (5x5, 25 qubits)."""
    edges = []
    nid = lambda r, c: r * cols + c
    for r in range(rows):
        for c in range(cols):
            if c + 1 < cols:
                edges.append((nid(r, c), nid(r, c + 1)))
            if r + 1 < rows:
                edges.append((nid(r, c), nid(r + 1, c)))
    return edges

def all_to_all_topology(n: int = 27) -> List[Tuple[int, int]]:
    """All-to-all fully connected topology (e.g. Trapped-Ion / Photonic)."""
    return [(i, j) for i in range(n) for j in range(i + 1, n)]

# =====================================================================
# 2. Topologies Dictionary
# =====================================================================

topologies: Dict[str, Dict] = {
    "ibm_27q_falcon": {
        "name": "IBM Falcon 27Q (Heavy-Hex)",
        "num_qubits": 27,
        "edges": ibm_27q_falcon_topology(),
        "type": "Superconducting Heavy-Hex",
        "avg_degree": 2.44,
        "diameter": 11,
    },
    "square_grid_25q": {
        "name": "2D Square Grid (25Q, 5x5)",
        "num_qubits": 25,
        "edges": square_grid_topology(5, 5),
        "type": "2D Lattice",
        "avg_degree": 3.20,
        "diameter": 8,
    },
    "all_to_all_27q": {
        "name": "Trapped-Ion All-to-All (27Q)",
        "num_qubits": 27,
        "edges": all_to_all_topology(27),
        "type": "Fully Connected K_27",
        "avg_degree": 26.0,
        "diameter": 1,
    }
}

# =====================================================================
# 3. Benchmark Circuits
# =====================================================================

def generate_qft_qasm(n: int = 5) -> str:
    lines = ["OPENQASM 2.0;", 'include "qelib1.inc";', f"qreg q[{n}];", f"creg c[{n}];"]
    for j in range(n):
        lines.append(f"h q[{j}];")
        for k in range(j + 1, n):
            lines.append(f"cx q[{k}], q[{j}];")
            lines.append(f"rz(0.785398) q[{j}];")
            lines.append(f"cx q[{k}], q[{j}];")
    return "\n".join(lines)

def generate_ghz_qasm(n: int = 5) -> str:
    lines = ["OPENQASM 2.0;", 'include "qelib1.inc";', f"qreg q[{n}];", f"creg c[{n}];", "h q[0];"]
    for j in range(n - 1):
        lines.append(f"cx q[{j}], q[{j+1}];")
    return "\n".join(lines)

def generate_toffoli_chain_qasm(n: int = 5) -> str:
    lines = ["OPENQASM 2.0;", 'include "qelib1.inc";', f"qreg q[{n}];", f"creg c[{n}];", "h q[0];", "h q[1];"]
    for j in range(n - 2):
        lines.append(f"ccx q[{j}], q[{j+1}], q[{j+2}];")
    return "\n".join(lines)

# =====================================================================
# 4. Topology Comparison Evaluator
# =====================================================================

def compare_topologies(qasm_circuit: str, lookahead: int = 3, iterations: int = 5) -> Dict:
    results = {}
    for key, topo_meta in topologies.items():
        cg = CouplingGraph(topo_meta["edges"])
        run = compile_qasm(qasm_circuit, cg, lookahead=lookahead, iterations=iterations)
        results[key] = {
            "name": topo_meta["name"],
            "swaps_inserted": run["swaps_inserted"],
            "routed_gates": run["routed_gate_count"],
            "avg_degree": topo_meta["avg_degree"],
            "diameter": topo_meta["diameter"],
            "qir_preview": run["qir_preview"][:150] + "...",
        }
    return results

def print_comparison_table(circuit_name: str, results: Dict):
    print("=" * 80)
    print(f"  TOPOLOGY COMPARISON — {circuit_name} (SABRE Lookahead Routing)")
    print("=" * 80)
    print(f"{'Topology':<32} | {'SWAPs':<8} | {'Routed Ops':<12} | {'Avg Deg':<8} | {'Diam':<6}")
    print("-" * 80)
    for k, v in results.items():
        print(f"{v['name']:<32} | {v['swaps_inserted']:<8} | {v['routed_gates']:<12} | {v['avg_degree']:<8.2f} | {v['diameter']:<6}")
    print("=" * 80)

if __name__ == "__main__":
    print("Running Topology Comparison Benchmark...")
    qft_circuit = generate_qft_qasm(5)
    res = compare_topologies(qft_circuit, lookahead=4)
    print_comparison_table("Quantum Fourier Transform QFT(5)", res)
