/**
 * hpcQcSim.ts — Simulates the ORNL hardware-agnostic HPC-QC software stack.
 * Reference: Elsevier FGCS 2026 (Shehata et al.) & ACM HPQCI '24 (Saurabh et al.)
 */

export interface LayerProfile {
  name: string;
  latency_us: number;
  bandwidth_gbps: number;
  notes: string;
}

export interface QuantumJob {
  id: number;
  n_qubits: number;
  depth: number;
  shots: number;
  pattern: "simultaneous" | "interleaved";
  kind: "circuit" | "vqls" | "qaoa";
  arrival: number;
  duration_us: number;
  start?: number;
  end?: number;
}

export interface SchedulerStats {
  completed: number;
  makespan_us: number;
  avg_wait_us: number;
  avg_exec_us: number;
  throughput_per_ms: number;
}

export interface VqlsResult {
  algorithm: string;
  n_qubits: number;
  ansatz_layers: number;
  iterations: number;
  final_cost: number;
  cost_history: number[];
}

export interface MiniAppMotifResult {
  motif: string;
  name: string;
  description: string;
  n_qubits: number;
  iterations: number;
  timeline_us: number[];
  total_us: number;
}

export const ORNL_LAYERS: LayerProfile[] = [
  { name: "Hybrid application", latency_us: 1.0, bandwidth_gbps: 100.0, notes: "User code, interpreter or native binary" },
  { name: "Quantum gateway interface", latency_us: 5.0, bandwidth_gbps: 50.0, notes: "REST/gRPC boundary & security envelope" },
  { name: "Quantum Platform Manager API (QPM)", latency_us: 2.0, bandwidth_gbps: 80.0, notes: "Vendor/hardware abstraction interface" },
  { name: "Compiler / circuit optimization toolchain", latency_us: 50.0, bandwidth_gbps: 1.0, notes: "Dynamic single-qubit fusion & SABRE routing" },
  { name: "Resource manager + scheduler", latency_us: 10.0, bandwidth_gbps: 10.0, notes: "Slurm/QCUP dual-scheduler reservation" },
  { name: "Quantum controller", latency_us: 0.5, bandwidth_gbps: 5.0, notes: "FPGA pulse generation, <1 µs gate pulse" },
  { name: "QPU (on-prem / cloud)", latency_us: 0.1, bandwidth_gbps: 0.1, notes: "Cryogenic superconducting/ion trap execution" },
];

export class QuantumScheduler {
  qpuSlots: number;
  tickUs: number;
  clock = 0.0;
  running: QuantumJob[] = [];
  completed: QuantumJob[] = [];
  queue: QuantumJob[] = [];

  constructor(qpuSlots = 1, tickUs = 1.0) {
    this.qpuSlots = qpuSlots;
    this.tickUs = tickUs;
  }

  submit(job: QuantumJob) {
    job.arrival = this.clock;
    const avgLayerLatency = ORNL_LAYERS.reduce((acc, l) => acc + l.latency_us, 0) / ORNL_LAYERS.length;
    const gateTimeUs = 0.05;
    const execUs = job.depth * gateTimeUs * job.shots;
    job.duration_us = Math.round(execUs + avgLayerLatency * 4);
    this.queue.push(job);
  }

  step() {
    while (this.queue.length > 0 && this.running.length < this.qpuSlots) {
      const j = this.queue.shift()!;
      j.start = this.clock;
      this.running.push(j);
    }
    this.clock += this.tickUs;
    const finished: QuantumJob[] = [];
    for (const j of this.running) {
      if (this.clock - (j.start || 0) >= j.duration_us) {
        j.end = this.clock;
        finished.push(j);
      }
    }
    for (const j of finished) {
      const idx = this.running.indexOf(j);
      if (idx !== -1) this.running.splice(idx, 1);
      this.completed.push(j);
    }
  }

  run(maxTicks = 200000) {
    for (let t = 0; t < maxTicks; t++) {
      this.step();
      if (this.queue.length === 0 && this.running.length === 0) break;
    }
  }

  stats(): SchedulerStats {
    if (this.completed.length === 0) {
      return {
        completed: 0,
        makespan_us: 0,
        avg_wait_us: 0,
        avg_exec_us: 0,
        throughput_per_ms: 0,
      };
    }
    const waits = this.completed.map(j => (j.start || 0) - j.arrival);
    const execs = this.completed.map(j => (j.end || 0) - (j.start || 0));
    const makespan = Math.max(...this.completed.map(j => j.end || 0));
    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      completed: this.completed.length,
      makespan_us: parseFloat(makespan.toFixed(2)),
      avg_wait_us: parseFloat(mean(waits).toFixed(2)),
      avg_exec_us: parseFloat(mean(execs).toFixed(2)),
      throughput_per_ms: parseFloat(((this.completed.length / (makespan / 1000)) || 0).toFixed(3)),
    };
  }
}

/**
 * Variational Quantum Linear Solver — the ORNL demonstration algorithm.
 */
export function simulateVqls(nQubits = 4, layers = 3, iterations = 40, seed = 0x515): VqlsResult {
  let s = seed % 2147483647;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const costHist: number[] = [];
  let cost = 1.0;
  for (let it = 0; it < iterations; it++) {
    cost = cost * 0.93 + 0.015 * (rand() - 0.5);
    costHist.push(Math.max(parseFloat(cost.toFixed(5)), 0.001));
  }

  return {
    algorithm: "VQLS (A x = b)",
    n_qubits: nQubits,
    ansatz_layers: layers,
    iterations,
    final_cost: costHist[costHist.length - 1],
    cost_history: costHist,
  };
}

export const MINIAPP_MOTIFS: Record<string, { name: string; desc: string }> = {
  M1_sequential: { name: "M1: Sequential", desc: "classical -> quantum -> classical" },
  M2_pipelined: { name: "M2: Pipelined", desc: "streamed classical <-> quantum" },
  M3_concurrent: { name: "M3: Concurrent", desc: "parallel independent QPU jobs" },
  M4_coupled: { name: "M4: Coupled iterative", desc: "iterative VQE/QAOA loop" },
  M5_ensemble: { name: "M5: Ensemble / batched", desc: "many shots, aggregation" },
  M6_hierarchical: { name: "M6: Hierarchical", desc: "nested hybrid sub-workflows" },
};

export function simulateMiniAppMotif(motifKey: string, nQubits = 6, iters = 6): MiniAppMotifResult {
  const meta = MINIAPP_MOTIFS[motifKey] || { name: motifKey, desc: "" };
  let timeline: number[] = [];

  if (motifKey === "M1_sequential") {
    timeline = [1.2, ...Array.from({ length: iters - 1 }, (_, i) => 0.5 * (i + 1))];
  } else if (motifKey === "M2_pipelined") {
    timeline = Array.from({ length: iters }, (_, i) => 0.45 + 0.05 * Math.sin(i));
  } else if (motifKey === "M3_concurrent") {
    timeline = Array.from({ length: iters }, () => 0.95);
  } else if (motifKey === "M4_coupled") {
    timeline = Array.from({ length: iters }, (_, i) => 1.8 * Math.pow(0.78, i));
  } else if (motifKey === "M5_ensemble") {
    timeline = Array.from({ length: iters }, () => 2.2 / Math.sqrt(iters));
  } else if (motifKey === "M6_hierarchical") {
    timeline = Array.from({ length: iters }, (_, i) => 3.2 * Math.pow(0.72, i));
  } else {
    timeline = Array.from({ length: iters }, () => 1.0);
  }

  const roundedTimeline = timeline.map(t => parseFloat(t.toFixed(3)));
  const total = roundedTimeline.reduce((a, b) => a + b, 0);

  return {
    motif: motifKey,
    name: meta.name,
    description: meta.desc,
    n_qubits: nQubits,
    iterations: iters,
    timeline_us: roundedTimeline,
    total_us: parseFloat(total.toFixed(3)),
  };
}

export function runFullHpcQcSimulation(nJobs = 20, qpuSlots = 1, patternOverride?: "simultaneous" | "interleaved") {
  const sched = new QuantumScheduler(qpuSlots, 1.0);
  let s = 0xa1ce;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const qubitChoices = [4, 6, 8, 12, 16];
  const shotChoices = [512, 1024, 4096];
  const kindChoices: ("circuit" | "vqls" | "qaoa")[] = ["circuit", "vqls", "qaoa"];

  for (let i = 0; i < nJobs; i++) {
    const pattern = patternOverride || (rand() > 0.5 ? "simultaneous" : "interleaved");
    const job: QuantumJob = {
      id: i + 1,
      n_qubits: qubitChoices[Math.floor(rand() * qubitChoices.length)],
      depth: Math.floor(rand() * 180) + 20,
      shots: shotChoices[Math.floor(rand() * shotChoices.length)],
      pattern,
      kind: kindChoices[Math.floor(rand() * kindChoices.length)],
      arrival: 0,
      duration_us: 0,
    };
    sched.submit(job);
  }

  sched.run();

  const motifs = Object.keys(MINIAPP_MOTIFS).reduce((acc, m) => {
    acc[m] = simulateMiniAppMotif(m);
    return acc;
  }, {} as Record<string, MiniAppMotifResult>);

  return {
    layers: ORNL_LAYERS,
    scheduler_stats: sched.stats(),
    jobs_dispatched: sched.completed,
    vqls_demo: simulateVqls(),
    mini_apps: motifs,
  };
}
