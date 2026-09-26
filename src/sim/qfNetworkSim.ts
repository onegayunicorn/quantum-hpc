/**
 * qfNetworkSim.ts — Simulates the QF Network v0.1.12 blockchain platform.
 * Models:
 *  - SPIN consensus protocol (21 validator nodes, 2/3 stake quorum)
 *  - PolkaVM (RISC-V RV32E) contract execution & gas metering
 *  - Parachain collators & epochs
 *  - Dev activity & repository structure
 */

export interface SpinNode {
  id: number;
  stake: number;
  online: boolean;
  latency_ms: number;
}

export interface SpinBlock {
  height: number;
  proposer: number;
  votes: number;
  timestamp_ms: number;
  finalized: boolean;
  tx_count: number;
}

export interface SpinConsensusResult {
  blocks_produced: number;
  blocks_finalized: number;
  finality_rate: number;
  avg_votes: number;
  chain_duration_s: number;
  blocks: SpinBlock[];
  total_stake: number;
}

export interface PolkaVmContract {
  name: string;
  riscv_blob_size: number;
  gas_limit: number;
}

export interface PolkaVmExecution {
  contract: string;
  riscv_blob_bytes: number;
  ops_executed: number;
  gas_used: number;
  gas_limit: number;
  status: "ok" | "out_of_gas";
  sample_opcodes: string[];
}

export interface ParachainSlot {
  slot_id: number;
  collator: string;
  blocks: number;
}

export interface ParachainResult {
  epochs: number;
  avg_blocks_per_epoch: number;
  unique_collators: number;
  slots: ParachainSlot[];
}

export interface DevActivityResult {
  months: number;
  commits_per_month: number[];
  avg_commits: number;
  language: string;
}

export class SpinConsensus {
  static QUORUM_FRACTION = 2 / 3;
  nodes: SpinNode[];
  totalStake: number;
  chain: SpinBlock[] = [];
  clockMs = 0.0;

  constructor(nNodes = 21, seed = 11) {
    let s = seed % 2147483647;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    this.nodes = Array.from({ length: nNodes }, (_, i) => ({
      id: i,
      stake: Math.round(100 + rand() * 900),
      online: true,
      latency_ms: 40 + rand() * 30,
    }));
    this.totalStake = this.nodes.reduce((acc, n) => acc + n.stake, 0);
  }

  produceBlock(rand: () => number): SpinBlock {
    const online = this.nodes.filter(n => n.online);
    const proposer = online.reduce((max, n) => (n.stake > max.stake ? n : max), online[0]);

    let votes = 0;
    let quorumStake = 0;

    for (const n of online) {
      if (n.id === proposer.id || rand() < 0.95) {
        votes++;
        quorumStake += n.stake;
      }
    }

    const isFinalized = quorumStake / this.totalStake >= SpinConsensus.QUORUM_FRACTION;
    const block: SpinBlock = {
      height: this.chain.length + 1,
      proposer: proposer.id,
      votes,
      timestamp_ms: this.clockMs,
      finalized: isFinalized,
      tx_count: Math.floor(rand() * 45) + 5,
    };

    this.clockMs += 6000; // 6s slot
    this.chain.push(block);
    return block;
  }

  run(nBlocks = 50): SpinConsensusResult {
    let s = 42;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    for (let i = 0; i < nBlocks; i++) {
      this.produceBlock(rand);
    }

    const finalized = this.chain.filter(b => b.finalized).length;
    const meanVotes = this.chain.reduce((acc, b) => acc + b.votes, 0) / this.chain.length;

    return {
      blocks_produced: this.chain.length,
      blocks_finalized: finalized,
      finality_rate: parseFloat((finalized / this.chain.length).toFixed(3)),
      avg_votes: parseFloat(meanVotes.toFixed(2)),
      chain_duration_s: this.clockMs / 1000,
      blocks: this.chain,
      total_stake: this.totalStake,
    };
  }
}

export class PolkaVmSimulator {
  static OPCODES = ["add", "sub", "mul", "load", "store", "jmp", "br", "call", "ret"];

  execute(contract: PolkaVmContract, seed = 3): PolkaVmExecution {
    let s = seed % 2147483647;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    const nOps = Math.floor(contract.riscv_blob_size / 4);
    const gasUsed = Math.min(contract.gas_limit, Math.floor(nOps * (0.8 + rand() * 0.4)));

    const opsRun: string[] = [];
    const sampleLimit = Math.min(nOps, 12);
    for (let i = 0; i < sampleLimit; i++) {
      opsRun.push(PolkaVmSimulator.OPCODES[Math.floor(rand() * PolkaVmSimulator.OPCODES.length)]);
    }

    return {
      contract: contract.name,
      riscv_blob_bytes: contract.riscv_blob_size,
      ops_executed: nOps,
      gas_used: gasUsed,
      gas_limit: contract.gas_limit,
      status: gasUsed < contract.gas_limit ? "ok" : "out_of_gas",
      sample_opcodes: opsRun,
    };
  }
}

export function simulateParachain(epochs = 10, seed = 9): ParachainResult {
  let s = seed % 2147483647;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const slots: ParachainSlot[] = [];
  const collatorPool = Array.from({ length: 15 }, (_, i) => `collator-${String(i + 1).padStart(2, "0")}`);

  for (let e = 0; e < epochs; e++) {
    slots.push({
      slot_id: e + 1,
      collator: collatorPool[Math.floor(rand() * collatorPool.length)],
      blocks: Math.floor(560 + rand() * 80),
    });
  }

  const mean = slots.reduce((acc, s) => acc + s.blocks, 0) / slots.length;
  const unique = new Set(slots.map(s => s.collator)).size;

  return {
    epochs,
    avg_blocks_per_epoch: parseFloat(mean.toFixed(1)),
    unique_collators: unique,
    slots,
  };
}

export function simulateDevActivity(months = 6, baseCommits = 143): DevActivityResult {
  let s = 0x2b;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const commits = Array.from({ length: months }, () => baseCommits + Math.floor((rand() - 0.4) * 50));
  const mean = commits.reduce((a, b) => a + b, 0) / commits.length;

  return {
    months,
    commits_per_month: commits,
    avg_commits: parseFloat(mean.toFixed(1)),
    language: "Rust (99.8%)",
  };
}

export function runFullQfNetworkSimulation() {
  const spin = new SpinConsensus(21, 11).run(50);
  const pvm = new PolkaVmSimulator();

  const contracts: PolkaVmContract[] = [
    { name: "calculator_demo", riscv_blob_size: 2048, gas_limit: 100000 },
    { name: "erc20_token_asset", riscv_blob_size: 8192, gas_limit: 500000 },
    { name: "quantum_vault_flash_loan", riscv_blob_size: 16384, gas_limit: 1000000 },
  ];

  const pvmResults = contracts.map((c, idx) => pvm.execute(c, idx + 7));
  const parachain = simulateParachain(10);
  const devActivity = simulateDevActivity(6, 143);

  return {
    release: "v0.1.12",
    spin,
    polkavm: pvmResults,
    parachain,
    dev_activity: devActivity,
  };
}
