#!/usr/bin/env python3
"""run_all.py — Master runner. Generates all reports + digest + NOON + SABRE/Qiskit suite.
Evidence level: simulated (labeled in every output). Run from repo root.
"""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
os.makedirs("reports", exist_ok=True)

import topology_compare, benchmark_compare, hpc_qc_sim, qf_network_sim, noon_states
import qiskit_transpiler_benchmark


def main():
    print("=" * 66)
    print("  QUANTUM-HPC INTEGRATION SIMULATION SUITE")
    print("=" * 66)

    t = topology_compare.main()
    b = benchmark_compare.main()
    h = hpc_qc_sim.main()
    q = qf_network_sim.main()
    n = noon_states.main()

    from qllvm_sim import compile_qasm, FALCON27
    demo = [
        "OPENQASM 2.0;", "qreg q[5];",
        "h q[0];", "cx q[0],q[1];", "ccx q[0],q[1],q[2];", "cx q[2],q[3];",
    ]
    qllvm = compile_qasm(demo, FALCON27, 27, use_full_sabre=True)
    with open("reports/02_qllvm_pipeline.json", "w") as f:
        json.dump(qllvm, f, indent=2)
    print(f"✅ 02_qllvm_pipeline.json — router={qllvm.get('router')} swaps={qllvm['swaps_inserted']}")

    with open("reports/01_extracted_data.json", "w") as f:
        json.dump({
            "evidence_level": "simulated",
            "sources": [
                "arXiv:2604.15094v1",
                "Elsevier FGCS 2026",
                "ACM HPQCI 24",
                "QF Network v0.1.12",
                "Qiskit transpiler options (simulated)",
            ],
        }, f, indent=2)
    print("✅ 01_extracted_data.json")

    print("\n[7/7] Qiskit Transpiler Comparison (simulated)...")
    qiskit_results = qiskit_transpiler_benchmark.run_qiskit_benchmark()
    n_configs = len(qiskit_results["results"].get("ghz5", {}))
    print(f"  ✅ {len(qiskit_results['results'])} circuits × {n_configs} transpiler configs")

    digest = {
        "evidence_level": "simulated",
        "qllvm_vs_qiskit_gate_reduction_pct": b["summary"]["qllvm_vs_qiskit_gate_reduction_pct"],
        "qllvm_swaps_inserted": qllvm["swaps_inserted"],
        "qllvm_router": qllvm.get("router"),
        "vqls_final_cost": h["vqls"]["final_cost"],
        "qf_finality_rate": q["finality_rate"],
        "noon_N10_fidelity": n["states"][-1]["fidelity"],
        "topologies_compared": len(t["topologies"]),
        "qiskit_transpiler_configs": n_configs,
    }
    with open("reports/digest.json", "w") as f:
        json.dump(digest, f, indent=2)
    print("✅ reports/digest.json —", json.dumps(digest))

    for name in ["digest.json", "06_topology_comparison.json"]:
        src = f"reports/{name}"
        if os.path.exists(src):
            os.replace(src, name)
    print("=" * 66)
    print("  ALL SIMULATIONS COMPLETE — artifacts ready for strict seal")
    print("=" * 66)


if __name__ == "__main__":
    main()
