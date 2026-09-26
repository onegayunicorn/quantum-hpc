---
title: Sovereign-Omega-3.0.0-Quantum-HPC
emoji: ⚛️
colorFrom: indigo
colorTo: cyan
sdk: docker
app_port: 3000
pinned: false
license: apache-2.0
short_description: QLLVM Co-Compilation, SABRE Routing & QIR 1.0 Workbench
---

# ⚛️ Sovereign Quantum-HPC Stack (v3.0.0)

[![Space Status](https://img.shields.io/badge/HuggingFace-Space%20Ready-blue)](https://huggingface.co/spaces/Omegapixel/Sovereign-Omega-3.0.0)
[![Merkle Root](https://img.shields.io/badge/Merkle%20Root-71d1bbc0...-emerald)](ledger_event_VERIFIED_HPC_SIMULATION.json)
[![Integrity](https://img.shields.io/badge/Integrity-100%25%20Cryptographically%20Sealed-purple)]()
[![License](https://img.shields.io/badge/License-Apache%202.0-green)](LICENSE)

An interactive, cryptographically verifiable Quantum-HPC co-compilation and simulation workbench. Built 1:1 against arXiv:2604.15094v1 (QLLVM), ORNL FGCS 2026, ACM HPQCI '24 Mini-Apps, and QF Network v0.1.12.

---

## 🚀 Key Modules & Capabilities

1. **QIR 1.0 Preview & Lowering Engine**
   - Direct translation from OpenQASM 2.0 to LLVM IR with `@__quantum__qis__*` intrinsics.
   - Interactive viewer modes: **Clean QIR**, **Annotated QIR**, and **Intrinsics Inventory**.
   - Real-time opcode search, clipboard copy, and `.ll` assembly file download.

2. **QLLVM Co-Compilation Workbench**
   - 3-stage co-compilation pipeline: Frontend parsing $\rightarrow$ MLIR Quantum Dialect $\rightarrow$ LLVM IR (QIR 1.0).
   - Barenco Toffoli decomposition (6 CX + 9 1Q gates).
   - Dynamic Euler rotation fusion (ZYZ, XYX, ZXZ canonical forms).
   - 4 Canonical SABRE Routing fixes: lookahead single-qubit filtering, strict budget enforcement, randomized physical layout restarts, and final physical qubit relabeling.

3. **Hardware Topology Detour Minimization**
   - Comparative SABRE routing across:
     - **IBM Falcon 27Q Heavy-Hex** (avg degree 2.44, diameter 11)
     - **2D Square Grid 25Q** (avg degree 3.20, diameter 8)
     - **Trapped-Ion All-to-All 27Q** (avg degree 26.0, diameter 1)
   - Step-by-step interactive swap playback and detour penalty metrics.

4. **NOON State Metrology & 5000-Step Cascade Polish**
   - Synthesizes path-entangled states $(|N,0\rangle + |0,N\rangle)/\sqrt{2}$ across 2× Nb microwave cavities.
   - 5000-step auto-resequencing polish elevating high-N fidelities ($N=7..10$) above $0.95$.
   - Confirms Heisenberg-limit phase sensitivity ($\Delta\phi \propto 1/N$) over classical SQL ($1/\sqrt{N}$).

5. **Cryptographic Truth Ledger & Merkle Chaining**
   - End-to-end SHA-256 digests across all 15 simulation artifacts.
   - Chained to the Dola Digital Twin (`8c34c4e2de`) Merkle progression:
     - Previous Root: `4a48ab97a23d4567e6`
     - Active Root: `71d1bbc0107e8663af0bbbc59b3dd1011f858f8d4034fbb61a2bc099d465e628`
   - Signed `VERIFIED_HPC_SIMULATION` event generation.

---

## 🛠️ Deploying to Hugging Face Spaces

### Method 1: Using `huggingface-cli` (Recommended)
```bash
# Login to Hugging Face
huggingface-cli login

# Clone or push to Space
huggingface-cli upload Omegapixel/Sovereign-Omega-3.0.0 . --repo-type space
```

### Method 2: Using Git Remote
```bash
git remote add space https://huggingface.co/spaces/Omegapixel/Sovereign-Omega-3.0.0
git add .
git commit -m "feat: deploy Sovereign Quantum-HPC Stack v3.0.0 with QIR 1.0 Workbench"
git push space main
```

---

## 📦 Local Development

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Run Python simulation suite
python3 run_all.py
python3 noon_metrology_sim.py
python3 seal_truth_ledger.py
```
