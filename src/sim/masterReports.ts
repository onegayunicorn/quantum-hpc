/**
 * masterReports.ts — Orchestrates the full simulation suite and compiles all
 * 6 official JSON reports plus the combined digest.json.
 */

import { buildExtractedDataReport } from "./extractedData";
import { QLLVMCompiler, CouplingGraph, ibm27FalconTopology } from "./qllvmEngine";
import { runBenchmarkSuite } from "./benchmarkCompare";
import { runFullHpcQcSimulation } from "./hpcQcSim";
import { runFullQfNetworkSimulation } from "./qfNetworkSim";
import { runTopologyComparison } from "./topologyCompare";

export interface MasterReportBundle {
  generated_utc: string;
  files: {
    "01_extracted_data.json": any;
    "02_qllvm_pipeline.json": any;
    "03_benchmark.json": any;
    "04_hpc_qc_stack.json": any;
    "05_qf_network.json": any;
    "06_topology_comparison.json": any;
    "digest.json": any;
  };
}

export const SAMPLE_DEFAULT_QASM = `OPENQASM 2.0;
include "qelib1.inc";
qreg q[5];
creg c[5];
h q[0];
h q[0];
x q[1];
rz(0.3) q[2];
cx q[0], q[1];
cx q[1], q[2];
cx q[2], q[3];
cx q[3], q[4];
ccx q[0], q[1], q[2];
measure q[0] -> c[0];
measure q[1] -> c[1];
`;

export function runAllSimulations(customQasm = SAMPLE_DEFAULT_QASM): MasterReportBundle {
  const timestamp = new Date().toISOString();

  // 1. Extracted Data
  const report1 = buildExtractedDataReport();

  // 2. QLLVM Pipeline
  const cgFalcon = new CouplingGraph(ibm27FalconTopology());
  const qllvm = new QLLVMCompiler(cgFalcon, 5);
  const report2 = qllvm.compile(customQasm, true, 3);

  // 3. Benchmark Comparison
  const report3 = runBenchmarkSuite();

  // 4. HPC-QC Software Stack
  const report4 = runFullHpcQcSimulation(20, 1);

  // 5. QF Network Blockchain
  const report5 = runFullQfNetworkSimulation();

  // 6. SABRE Topology Comparison
  const report6 = runTopologyComparison(customQasm, 3);

  // Digest summary
  const digest = {
    generated_utc: timestamp,
    sections: [
      "extracted_data",
      "qllvm_pipeline",
      "benchmark",
      "hpc_qc_stack",
      "qf_network",
      "topology_comparison",
    ],
    summary: {
      qllvm_vs_qiskit_gate_reduction_pct: report3.reported.QLLVM_vs_Qiskit.gate_reduction_pct,
      qllvm_vs_cirq_gate_reduction_pct: report3.reported.QLLVM_vs_Cirq.gate_reduction_pct,
      qllvm_vs_pennylane_gate_reduction_pct: report3.reported.QLLVM_vs_PennyLane.gate_reduction_pct,
      qllvm_swaps_inserted: report2.swaps_inserted,
      qllvm_final_gate_count: report2.gate_count,
      qllvm_final_depth: report2.circuit_depth,
      ccx_decomposition_cx_inserted: report6.ccx_sanity_check.cx_inserted,
      topology_swap_ratio_heavyhex_over_alltoall: report6.summary.swap_ratio_heavyhex_over_alltoall,
      topology_swap_ratio_square_over_alltoall: report6.summary.swap_ratio_square_over_alltoall,
      hpc_qc_layers: report4.layers.length,
      hpc_qc_jobs_completed: report4.scheduler_stats.completed,
      vqls_final_cost: report4.vqls_demo.final_cost,
      qf_blocks_finalized: report5.spin.blocks_finalized,
      qf_finality_rate: report5.spin.finality_rate,
      qf_polkavm_contracts_ok: report5.polkavm.filter(c => c.status === "ok").length,
    },
  };

  return {
    generated_utc: timestamp,
    files: {
      "01_extracted_data.json": report1,
      "02_qllvm_pipeline.json": report2,
      "03_benchmark.json": report3,
      "04_hpc_qc_stack.json": report4,
      "05_qf_network.json": report5,
      "06_topology_comparison.json": report6,
      "digest.json": digest,
    },
  };
}

export function downloadJsonFile(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
