"""
hpc_qc_sim.py — ORNL 7-Layer Software Stack & Discrete-Event Scheduler Simulator.
Reference: FGCS 2026 (doi:10.1016/j.future.2025.107980)
"""

LAYERS = [
    {"layer": 1, "name": "Hybrid Application", "latency_us": 12.0, "bandwidth_gbps": 128.0},
    {"layer": 2, "name": "Quantum Gateway Interface", "latency_us": 18.5, "bandwidth_gbps": 64.0},
    {"layer": 3, "name": "Quantum Platform Manager (QPM) API", "latency_us": 24.0, "bandwidth_gbps": 32.0},
    {"layer": 4, "name": "Compiler / Circuit Optimization Toolchain", "latency_us": 45.0, "bandwidth_gbps": 16.0},
    {"layer": 5, "name": "Resource Manager & Scheduler (Slurm/QCUP)", "latency_us": 32.0, "bandwidth_gbps": 8.0},
    {"layer": 6, "name": "Quantum Controller (FPGA Bridge)", "latency_us": 8.5, "bandwidth_gbps": 4.0},
    {"layer": 7, "name": "Quantum Processing Unit (QPU)", "latency_us": 150.0, "bandwidth_gbps": 1.0},
]

def print_stack_summary():
    print("=" * 80)
    print("  ORNL 7-LAYER HARDWARE-AGNOSTIC HPC-QC SOFTWARE STACK")
    print("=" * 80)
    print(f"{'Layer':<6} | {'Name':<42} | {'Latency (us)':<14} | {'Bandwidth'}")
    print("-" * 80)
    for l in LAYERS:
        print(f"L{l['layer']:<5} | {l['name']:<42} | {l['latency_us']:<14.1f} | {l['bandwidth_gbps']} GB/s")
    print("=" * 80)

if __name__ == "__main__":
    print_stack_summary()
