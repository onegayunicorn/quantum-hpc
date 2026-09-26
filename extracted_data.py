"""
extracted_data.py — All facts, numbers, and entities pulled from the PDF.

Sources:
  [A] arXiv:2604.15094v1  QLLVM
  [B] Elsevier FGCS 2026  HPC-Quantum convergence (ORNL)
  [C] ACM HPQCI '24       Quantum Mini-Apps
  [D] IEEE QCE 2024       Quantum Framework
  [E] X / QF Network      v0.1.12 release
  [F] ACM 2025            Quantum accelerator + HPC survey
"""

QLLVM = {
    "arxiv_id": "2604.15094v1",
    "title": "QLLVM: A Scalable Quantum-Classical Co-Compilation Framework based on LLVM",
    "date": "2026-04-16",
    "category": "quant-ph",
    "github": "https://github.com/QCFlow/QLLVM",
    "license": "arXiv.org perpetual non-exclusive license",
    "affiliation": "The Laboratory for Advanced Computing and Intelligence Engineering, Zhengzhou 450001, China",
    "corresponding_authors": ["Jinchen Xu (atao728208@126.com)", "Zheng Shan (shanzhengzz@163.com)"],
    "authors": [
        "Yu Zhu", "Qiming Du", "Yuqiong Jin", "Woji He", "Hang Lian",
        "Xin Zhou", "Jianyu Zhang", "Yiyang Chen", "Jinchen Xu", "Zheng Shan"
    ],
    "funding": "National Key R&D Program of China (No. 2024YFB4504103)",
    "toolchain": {
        "llvm_version": "12.0.1",
        "mlir_version": "12.0.1",
        "qir_spec": "QIR 1.0",
        "frontends": ["OpenQASM 2.0", "Qiskit circuits (optional)", "C/C++", "CUDA", "MPI"],
        "backends": ["LLVM-native", "nvcc", "mpicc/mpicxx", "qir-runner"],
    },
    "three_stage_design": [
        "Frontend: hybrid program parsing (Clang-analogous)",
        "Middle-end: MLIR quantum dialect + LLVM IR (QIR) optimization",
        "Backend: LLVM code generation + device-specific mapping",
    ],
    "quantum_dialect_types": ["Array", "Qubit", "Result"],
    "quantum_dialect_ops": [
        "QRTInitOp / QRTFinalizeOp",
        "QallocOp / DeallocOp",
        "QubitExtractOp",
        "InstOp",
    ],
    "lowering_map": {
        "QallocOp": "__quantum__rt__qubit__allocate_array",
        "DeallocOp": "__quantum__rt__qubit_release_array",
        "QubitExtractOp": "__quantum__rt__array_get_element_ptr + bitcast to %Qubit*",
        "InstOp": "__quantum__qis__{h,cx,rz,...}",
    },
    "mapping_routing": {
        "algorithm": "SABRE",
        "stage": "LLVM IR (QIR) level",
        "components": [
            "Coupling graph construction (adjacency list + BFS shortest paths)",
            "Initial layout (SabreLayout, 3 iterations default)",
            "Front-layer SWAP heuristic routing with lookahead window",
        ],
        "swap_intrinsic": "__quantum__qis__swap",
    },
    "hardware": {
        "cpu": "Intel Xeon Gold 6326",
        "ram_gb": 256,
        "gpu": "NVIDIA A100 (40 GB)",
    },
    "comparison_targets": {
        "Qiskit": "1.2.4",
        "Cirq": "1.5.0",
        "PennyLane": "0.42.3",
    },
    "benchmark_suite": "MQTBench (25 algorithms, 3–30 qubits)",
    "results_vs_qiskit": {"gate_count_reduction_pct": 3.98, "circuit_depth_reduction_pct": 3.56},
    "results_vs_cirq":   {"gate_count_reduction_pct": 1.19, "circuit_depth_reduction_pct": 1.61},
    "results_vs_pennylane": {"gate_count_reduction_pct": 74.96, "circuit_depth_reduction_pct": 77.06},
    "optimization_strategy": {
        "name": "dynamic single-qubit gate fusion + decomposition",
        "steps": [
            "Fuse consecutive single-qubit gates into one unitary",
            "Explore ZYZ / XYX / ZXZ Euler decompositions",
            "Dynamically select most compact representation",
        ],
    },
    "limitations": [
        "Gate-model only",
        "Limited JIT support for variational parameterized circuits",
        "Limited hardware-specific optimization for neutral atoms / photonics",
    ],
}

ORNL_HPC_QC = {
    "journal": "Future Generation Computer Systems (2026)",
    "doi": "10.1016/j.future.2025.107980",
    "title": "A software stack architecture for integrating QC with HPC (hardware-agnostic)",
    "affiliation": "Oak Ridge National Laboratory (ORNL), NCCS",
    "authors": [
        "Amir Shehata", "Peter Groszkowski", "Thomas Naughton",
        "Muralikrishnan Gopalakrishnan Meena", "Elaine Wong",
        "Daniel Claudino", "Rafael Ferreira da Silva", "Thomas Beck",
    ],
    "funding": "DOE Contract DE-AC05-00OR22725; LDRD Program",
    "software_stack_layers": [
        "Hybrid application (interpreter or compiled)",
        "Quantum gateway interface",
        "Quantum Platform Manager API (QPM)",
        "Compiler / circuit optimization toolchain",
        "Resource manager + scheduler",
        "Quantum controller (classical hardware <-> QPU bridge)",
        "QPU (on-prem or cloud)",
    ],
    "hardware_reference": {
        "ORNL_Frontier": "AMD GPUs (exascale reference)",
        "ORNL_Summit": "predecessor system",
        "programs": ["QCUP (Quantum Computing User Program)"],
    },
    "application_patterns": ["simultaneous", "interleaved"],
    "demonstration_algorithm": "Variational Quantum Linear Solver (VQLS)",
}

MINI_APPS = {
    "venue": "ACM HPQCI '24 (Pisa, Italy), June 3–4, 2024",
    "doi": "10.1145/3659996.3660036",
    "title": "A taxonomy of execution motifs in quantum mini-applications",
    "authors": [
        "Anthony M. Cabrera", "Frank Liu", "Thien Nguyen",
        "Pavel Lougovski", "Travis S. Humble",
    ],
    "six_execution_motifs": [
        {"id": "M1", "name": "Sequential", "quantum_invocations": 1, "classical_post": "Single readout decode"},
        {"id": "M2", "name": "Pipelined", "quantum_invocations": "N stages", "classical_post": "Streaming telemetry"},
        {"id": "M3", "name": "Concurrent independent", "quantum_invocations": "Parallel batch", "classical_post": "Bag of tasks aggregation"},
        {"id": "M4", "name": "Coupled iterative", "quantum_invocations": "Loop feedback", "classical_post": "VQE / QAOA parameter gradient"},
        {"id": "M5", "name": "Ensemble / batched", "quantum_invocations": "Multi-circuit", "classical_post": "Statistical variance reduction"},
        {"id": "M6", "name": "Hierarchical", "quantum_invocations": "Nested sub-circuits", "classical_post": "Error mitigation / syndrome decode"},
    ],
}

QF_NETWORK = {
    "release": "v0.1.12",
    "language_breakdown": {"Rust": 99.8, "Other": 0.2},
    "commits_last_month": 143,
    "active_branches": 22,
    "releases_total": 13,
    "consensus": "SPIN Consensus Protocol",
    "consensus_validators": 21,
    "quorum_threshold": 0.67,
    "slot_duration_ms": 6000,
    "epoch_duration_blocks": 600,
    "virtual_machine": "PolkaVM (RISC-V RV32E 32-bit embedded)",
    "architecture_tier": "Layer-1 Substrate Parachain with Jam Bridge",
}

if __name__ == "__main__":
    print("Extracted Data Module Loaded.")
    print(f"QLLVM ArXiv: {QLLVM['arxiv_id']} — {QLLVM['title']}")
    print(f"ORNL DOI: {ORNL_HPC_QC['doi']}")
    print(f"QF Network Release: {QF_NETWORK['release']} ({QF_NETWORK['language_breakdown']['Rust']}% Rust)")
