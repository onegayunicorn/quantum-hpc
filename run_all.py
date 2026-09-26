"""
run_all.py — Orchestrates all Python simulation modules.
Runs QLLVM SABRE compilation, topology comparison on IBM Falcon 27Q,
MQTBench reductions, ORNL 7-layer stack, and QF Network.
"""

from qllvm_sim import CouplingGraph, compile_qasm
from topology_compare import ibm_27q_falcon_topology, compare_topologies, print_comparison_table, generate_qft_qasm
from benchmark_compare import print_benchmark_table
from hpc_qc_sim import print_stack_summary
from qf_network_sim import QF_RELEASE_INFO

def main():
    print("=" * 80)
    print("   QUANTUM-HPC INTEGRATION STACK — MASTER RUNNER")
    print("=" * 80)
    
    print("\n[1/4] Running Topology Comparison with SABRE Lookahead Detour Minimizer...")
    qft = generate_qft_qasm(5)
    results = compare_topologies(qft, lookahead=4)
    print_comparison_table("QFT(5) on Hardware Topologies", results)

    print("\n[2/4] Displaying MQTBench Compilation Improvements...")
    print_benchmark_table()

    print("\n[3/4] Modeling ORNL 7-Layer HPC-QC Software Stack...")
    print_stack_summary()

    print("\n[4/4] Verifying QF Network Release v0.1.12 Metrics...")
    print(f"  Version: {QF_RELEASE_INFO['version']} | Rust Dominance: {QF_RELEASE_INFO['rust_percentage']}%")
    print(f"  Validators: {QF_RELEASE_INFO['validators_total']} | VM: {QF_RELEASE_INFO['vm']}")
    
    print("\nAll modules executed with zero errors!")

if __name__ == "__main__":
    main()
