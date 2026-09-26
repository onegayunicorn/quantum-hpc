#!/usr/bin/env python3
"""
qiskit_transpiler_benchmark.py — Full Qiskit Transpiler Options Suite (SIMULATED)

Because Qiskit is not always present, this module produces deterministic,
labeled-simulated results that mirror a real Qiskit transpile sweep
(opt levels 0–3 × routing methods × basis sets).
"""
from __future__ import annotations
import json
import os
import random
from typing import Any, Dict

RNG = random.Random(42)

QASM_EXAMPLES = {
    "ghz5": [
        "OPENQASM 2.0;", "qreg q[5];",
        "h q[0];", "cx q[0],q[1];", "cx q[0],q[2];", "cx q[0],q[3];", "cx q[0],q[4];",
    ],
    "toffoli3": [
        "OPENQASM 2.0;", "qreg q[3];",
        "h q[2];", "cx q[1],q[2];", "t q[2];", "cx q[0],q[2];", "t q[2];",
        "cx q[1],q[2];", "t q[1];", "t q[2];", "cx q[0],q[2];",
        "cx q[0],q[1];", "t q[2];", "t q[1];", "h q[2];",
    ],
}

ROUTING_METHODS = ["basic", "stochastic", "lookahead", "sabre"]
OPT_LEVELS = [0, 1, 2, 3]
BASIS_SETS = {
    "default_u3": ["u3", "cx"],
    "minimal": ["rx", "ry", "rz", "cx"],
    "ibm_falcon": ["sx", "x", "rz", "cx"],
}


def _sim_transpile(
    n_cx_base: int,
    n_1q_base: int,
    opt_level: int,
    routing: str,
    basis_name: str,
) -> Dict[str, Any]:
    opt_factor = 1.0 - 0.08 * opt_level
    routing_swap_factor = {
        "basic": 1.4,
        "stochastic": 1.15,
        "lookahead": 1.05,
        "sabre": 0.95,
    }[routing]
    basis_1q_mult = {"default_u3": 1.0, "minimal": 1.1, "ibm_falcon": 1.25}[basis_name]

    swaps = max(0, int(n_cx_base * 0.3 * routing_swap_factor * RNG.uniform(0.8, 1.2)))
    cx_count = max(1, int(n_cx_base * opt_factor) + swaps)
    oneq = max(0, int(n_1q_base * opt_factor * basis_1q_mult * RNG.uniform(0.9, 1.1)))
    depth = max(1, int((cx_count + oneq) * 0.45 * (1.0 - 0.05 * opt_level)))
    size = cx_count + oneq
    runtime = round(0.002 + 0.001 * size * RNG.uniform(0.7, 1.3), 4)

    return {
        "depth": depth,
        "size": size,
        "cx_count": cx_count,
        "1q_gates": oneq,
        "swaps_estimated": swaps,
        "runtime_s": runtime,
        "basis_gates": BASIS_SETS[basis_name],
        "evidence_level": "simulated",
    }


def run_qiskit_benchmark() -> Dict[str, Any]:
    results: Dict[str, Any] = {}
    base = {"ghz5": {"cx": 4, "1q": 1}, "toffoli3": {"cx": 6, "1q": 9}}

    for name, counts in base.items():
        circ_results = {}
        for opt in OPT_LEVELS:
            for routing in ROUTING_METHODS:
                key = f"opt_{opt}/routing_{routing}"
                circ_results[key] = _sim_transpile(
                    counts["cx"], counts["1q"], opt, routing, "ibm_falcon"
                )
        for basis_name in BASIS_SETS:
            circ_results[f"basis_{basis_name}"] = _sim_transpile(
                counts["cx"], counts["1q"], 3, "sabre", basis_name
            )
        results[name] = circ_results

    try:
        from qllvm_sim import compile_qasm, FALCON27
        sovereign = {}
        for name, qasm in QASM_EXAMPLES.items():
            r = compile_qasm(qasm, FALCON27, 27, use_full_sabre=True)
            sovereign[name] = {
                "swaps_inserted": r["swaps_inserted"],
                "cx_gates": r["cx_gates"],
                "gates_total": r["gates_total"],
                "router": r.get("router", "unknown"),
                "evidence_level": "simulated",
            }
    except Exception as e:
        sovereign = {"error": str(e)}

    out = {
        "benchmark": "Qiskit Transpiler Full Suite (SIMULATED)",
        "backend": "FakeFalcon27-style (IBM 27Q Heavy-Hex) — no live Qiskit required",
        "circuits_tested": list(QASM_EXAMPLES.keys()),
        "results": results,
        "sovereign_sabre_comparison": sovereign,
        "evidence_level": "simulated",
        "note": (
            "All numbers are deterministic simulations of expected transpile behaviour. "
            "Replace _sim_transpile with real qiskit.transpile when Qiskit + FakeFalcon27 "
            "are installed for live measurements."
        ),
    }

    os.makedirs("reports", exist_ok=True)
    path = "reports/qiskit_transpiler_comparison.json"
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"✅ {path}")
    return out


if __name__ == "__main__":
    run_qiskit_benchmark()
