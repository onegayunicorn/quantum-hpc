/**
 * extractedData.ts — All facts, numbers, and entities pulled from the Quantum-HPC digest.
 * Sources:
 *   [A] arXiv:2604.15094v1  QLLVM (Zhengzhou Lab)
 *   [B] Elsevier FGCS 2026  HPC-Quantum convergence (ORNL)
 *   [C] ACM HPQCI '24       Quantum Mini-Apps
 *   [D] IEEE QCE 2024       Quantum Framework
 *   [E] X / QF Network      v0.1.12 release
 *   [F] ACM 2025            Quantum accelerator + HPC survey
 */

export interface SourceMetadata {
  arxiv_id?: string;
  doi?: string;
  title: string;
  date?: string;
  category?: string;
  github?: string;
  affiliation?: string;
  corresponding_authors?: string[];
  authors: string[];
  funding?: string;
  venue?: string;
  citations?: number;
  downloads?: number;
}

export const QLLVM_METADATA = {
  arxiv_id: "2604.15094v1",
  title: "QLLVM: A Scalable Quantum-Classical Co-Compilation Framework based on LLVM",
  date: "2026-04-16",
  category: "quant-ph",
  github: "https://github.com/QCFlow/QLLVM",
  license: "arXiv.org perpetual non-exclusive license",
  affiliation: "The Laboratory for Advanced Computing and Intelligence Engineering, Zhengzhou 450001, China",
  corresponding_authors: ["Jinchen Xu (atao728208@126.com)", "Zheng Shan (shanzhengzz@163.com)"],
  authors: [
    "Yu Zhu", "Qiming Du", "Yuqiong Jin", "Woji He", "Hang Lian",
    "Xin Zhou", "Jianyu Zhang", "Yiyang Chen", "Jinchen Xu", "Zheng Shan",
  ],
  funding: "National Key R&D Program of China (No. 2024YFB4504103)",
  toolchain: {
    llvm_version: "12.0.1",
    mlir_version: "12.0.1",
    qir_spec: "QIR 1.0",
    frontends: ["OpenQASM 2.0", "Qiskit circuits (optional)", "C/C++", "CUDA", "MPI"],
    backends: ["LLVM-native", "nvcc", "mpicc/mpicxx", "qir-runner"],
  },
  three_stage_design: [
    "Frontend: hybrid program parsing (Clang-analogous)",
    "Middle-end: MLIR quantum dialect + LLVM IR (QIR) optimization",
    "Backend: LLVM code generation + device-specific mapping",
  ],
  quantum_dialect_types: ["Array", "Qubit", "Result"],
  quantum_dialect_ops: [
    "QRTInitOp / QRTFinalizeOp",
    "QallocOp / DeallocOp",
    "QubitExtractOp",
    "InstOp",
  ],
  lowering_map: {
    QallocOp: "__quantum__rt__qubit__allocate_array",
    DeallocOp: "__quantum__rt__qubit_release_array",
    QubitExtractOp: "__quantum__rt__array_get_element_ptr + bitcast to %Qubit*",
    InstOp: "__quantum__qis__{h,cx,rz,...}",
  },
  mapping_routing: {
    algorithm: "SABRE (Front-layer + Lookahead heuristic with randomized restarts)",
    stage: "LLVM IR (QIR) level",
    components: [
      "Coupling graph construction (adjacency list + BFS shortest paths)",
      "Initial layout (SabreLayout, 3-5 iterations with physical shuffle)",
      "Front-layer + Lookahead SWAP heuristic routing",
    ],
    swap_intrinsic: "__quantum__qis__swap",
  },
  hardware: {
    cpu: "Intel Xeon Gold 6326",
    ram_gb: 256,
    gpu: "NVIDIA A100 (40 GB)",
  },
  comparison_targets: {
    Qiskit: "1.2.4",
    Cirq: "1.5.0",
    PennyLane: "0.42.3",
  },
  benchmark_suite: "MQTBench (25 algorithms, 3–30 qubits)",
  results_vs_qiskit: { gate_count_reduction_pct: 3.98, circuit_depth_reduction_pct: 3.56 },
  results_vs_cirq: { gate_count_reduction_pct: 1.19, circuit_depth_reduction_pct: 1.61 },
  results_vs_pennylane: { gate_count_reduction_pct: 74.96, circuit_depth_reduction_pct: 77.06 },
  optimization_strategy: {
    name: "Dynamic single-qubit gate fusion + Barenco CCX decomposition",
    steps: [
      "Decompose 3-qubit Toffoli/CCX gates into 6 CX + 9 1Q gates (Barenco)",
      "Fuse consecutive single-qubit gates into one unitary",
      "Explore ZYZ / XYX / ZXZ Euler decompositions",
      "Dynamically select most compact representation",
    ],
  },
  limitations: [
    "Gate-model only",
    "Limited JIT support for variational parameterized circuits",
    "Limited hardware-specific optimization for neutral atoms / photonics",
  ],
};

export const ORNL_HPC_QC_METADATA = {
  journal: "Future Generation Computer Systems (2026)",
  doi: "10.1016/j.future.2025.107980",
  title: "A software stack architecture for integrating QC with HPC (hardware-agnostic)",
  affiliation: "Oak Ridge National Laboratory (ORNL), NCCS",
  authors: [
    "Amir Shehata", "Peter Groszkowski", "Thomas Naughton",
    "Muralikrishnan Gopalakrishnan Meena", "Elaine Wong",
    "Daniel Claudino", "Rafael Ferreira da Silva", "Thomas Beck",
  ],
  funding: "DOE Contract DE-AC05-00OR22725; LDRD Program",
  key_innovations: [
    "Unified resource management system for quantum + classical",
    "Flexible quantum programming interface (hardware abstraction)",
    "Quantum Platform Manager API (QPM)",
    "Comprehensive toolchain for circuit optimization and execution",
  ],
  software_stack_layers: [
    "Hybrid application (interpreter or compiled)",
    "Quantum gateway interface",
    "Quantum Platform Manager API",
    "Compiler / circuit optimization toolchain",
    "Resource manager + scheduler",
    "Quantum controller (classical hardware <-> QPU bridge)",
    "QPU (on-prem or cloud)",
  ],
  hardware_reference: {
    ORNL_Frontier: "AMD GPUs (exascale reference)",
    ORNL_Summit: "predecessor system",
    programs: ["QCUP (Quantum Computing User Program)"],
  },
  application_patterns: ["simultaneous", "interleaved"],
  demonstration_algorithm: "Variational Quantum Linear Solver (VQLS)",
  related_work: [
    "QHPC middleware conceptual renderings",
    "ORNL IRIS task-based runtime",
    "Munich Quantum Valley consortium",
  ],
  eurohpc_sites: ["Czechia", "Finland", "France", "Germany", "Italy", "Poland", "Spain"],
};

export const MINI_APPS_METADATA = {
  venue: "ACM HPQCI '24 (Pisa, Italy), June 3–4, 2024",
  doi: "10.1145/3659996.3660036",
  pages: "11–18",
  title: "Quantum Mini-Apps: A Framework for Developing and Benchmarking Quantum-HPC Applications",
  authors: ["Nishant Saurabh", "Pradeep Mantha", "Florian J. Kiwit", "Shantenu Jha", "Andre Luckow"],
  six_execution_motifs: [
    { id: "M1", name: "Sequential", flow: "classical -> quantum -> classical", desc: "Coarse-grained workflow where pre/post-processing runs on HPC." },
    { id: "M2", name: "Pipelined", flow: "streamed classical <-> quantum", desc: "Streaming batches between classical simulation and QPU." },
    { id: "M3", name: "Concurrent independent", flow: "parallel independent QPU jobs", desc: "Multiple embarrassingly parallel quantum circuits simultaneously." },
    { id: "M4", name: "Coupled iterative", flow: "iterative VQE/QAOA loop", desc: "Tight parameter feedback loop between classical optimizer and QPU." },
    { id: "M5", name: "Ensemble / batched", flow: "many shots, aggregation", desc: "Parameter sweep or error mitigation across QPU batch runs." },
    { id: "M6", name: "Hierarchical", flow: "nested hybrid sub-workflows", desc: "Multi-level hybrid orchestration across heterogeneous nodes." },
  ],
  purpose: [
    "Characterize quantum-HPC middleware",
    "Benchmark performance across coupling modes",
    "Provide reusable abstractions for hybrid workflows",
  ],
  total_citations: 7,
  total_downloads: 257,
};

export const IEEE_QUANTUM_FRAMEWORK = {
  venue: "IEEE QCE 2024",
  title: "A Framework for Integrating Quantum Simulation and High Performance Computing",
  purpose: "Streamline access to quantum simulation software and QC/HPC integration models",
  named_component: "Quantum Framework",
  citations: 6,
  full_text_views: 164,
};

export const QF_NETWORK_METADATA = {
  release: "v0.1.12",
  announcement_date: "2025-03-24 21:16",
  platform: "X (Twitter) @theqnetwork",
  views_at_capture: 23200,
  language: "Rust (99.8%)",
  commits_per_month: 143,
  repo_components: [
    { path: "client/consensus-spin", desc: "SPIN consensus protocol implementation" },
    { path: "primitives/consensus-spin", desc: "Consensus primitives and crypto types" },
    { path: "node", desc: "Main blockchain node orchestrator" },
    { path: "pallets", desc: "Modular Substrate blockchain pallets" },
    { path: "parachain", desc: "Polkadot relay chain integration" },
    { path: "pvm-prog & pvm-test-runner", desc: "PolkaVM RISC-V implementation & execution tests" },
    { path: "docker", desc: "Containerized deployment rigs" },
    { path: "zombienet", desc: "Automated network topology simulation" },
  ],
  polkavm: {
    isa: "RISC-V RV32E",
    toolchain: "RISC-V compilation pipeline",
    examples: ["calculator demo", "erc20_like", "flash_loan"],
  },
  build_targets: ["macOS", "Debian/Linux", "Windows (WSL)"],
  contributing: {
    branch_format: "your-github-name/descriptive-branch-name",
    pr_target: "main",
    coc: "Contributor Covenant",
  },
};

export const DIGEST_METADATA = {
  title: "Digest · Daily — Quantum framework digest",
  cadence: "Daily · 09:00 America/New_York",
  items_today: 6,
  topic: "Quantum-HPC integration frameworks — releases, announcements, and papers",
  next_run: "tomorrow 09:00 America/New_York",
  arxiv_note: "arXiv is now an independent nonprofit!",
};

export function buildExtractedDataReport() {
  return {
    digest: DIGEST_METADATA,
    qllvm: QLLVM_METADATA,
    ornl_hpc_qc: ORNL_HPC_QC_METADATA,
    mini_apps: MINI_APPS_METADATA,
    ieee: IEEE_QUANTUM_FRAMEWORK,
    qf_network: QF_NETWORK_METADATA,
  };
}
