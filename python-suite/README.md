# Sovereign Quantum-HPC Stack

Zero-trust, cryptographically sealed simulation suite.  
**All simulation outputs are labeled `evidence_level: simulated`** — hashes are real, physics numbers are simulated.

## Quick start (P0 → P1)
```bash
python3 run_all.py                      # full suite incl. SABRE + Qiskit-style benchmark
python3 seal_truth_ledger.py            # STRICT: exits 1 if any canonical artifact missing
python3 -c "import json; print(json.load(open('ledger_event_VERIFIED_HPC_SIMULATION.json'))['digital_twin']['new_merkle_root'])"
```

Or use the deterministic staging script:
```bash
bash scripts/prepare_and_seal.sh
```

## Run API (P2)
```bash
pip install fastapi uvicorn pydantic
uvicorn api:app --host 0.0.0.0 --port 8000
curl localhost:8000/health    # dynamic merkle root, never stale
```

## Layout
| File | Role |
|------|------|
| `run_all.py` | Master runner → all reports + digest |
| `src/qllvm_sim.py` | QLLVM pipeline, 4 SABRE fixes, CCX→Barenco, Euler fusion |
| `src/sabre_routing.py` | **Full SABRE lookahead router** (new) |
| `src/qiskit_transpiler_benchmark.py` | **Qiskit-style opt/routing/basis sweep** (simulated) |
| `src/topology_compare.py` | Falcon 27Q / Grid 25Q / All-to-All |
| `src/benchmark_compare.py` | MQTBench-style 25-algorithm sweep |
| `src/hpc_qc_sim.py` | ORNL 7-layer + VQLS (~0.034) + 6 mini-apps |
| `src/qf_network_sim.py` | SPIN consensus (100% finality) + PolkaVM |
| `src/noon_states.py` | NOON N=1→10 Heisenberg metrology |
| `seal_truth_ledger.py` | Strict-mode sealer (64-hex root) |
| `api.py` | FastAPI — dynamic root + evidence labels |
| `scripts/prepare_and_seal.sh` | Deterministic staging |
| `scripts/verify_p4_deployment.sh` | Live structural assertions |

## SABRE Routing
Implemented in `src/sabre_routing.py` and wired into `compile_qasm(..., use_full_sabre=True)`.

Four canonical fixes:
1. Lookahead filters single-qubit gates (only CX drives SWAP decisions)
2. Hard budget enforcement (no overshoot)
3. Randomized layout restarts (default 5)
4. Final layout reported in physical indices

## Qiskit Transpiler Comparison
`src/qiskit_transpiler_benchmark.py` produces a deterministic simulated sweep of:
- optimization levels 0–3
- routing methods: basic / stochastic / lookahead / sabre
- basis sets: default_u3 / minimal / ibm_falcon

Output: `reports/qiskit_transpiler_comparison.json`  
When real Qiskit + FakeFalcon27 are installed the same module can be switched to live transpile.

## Zero-trust rules (verified)
1. Strict mode: missing artifact → exit 1, never partial seal.
2. Failed attempts leave any prior valid ledger untouched.
3. `/api/compile` returns `evidence_level: simulated`.
4. `/health` reads root live from the sealed ledger — no hardcoded values.
5. SABRE has a hard max-steps guard (no infinite loops).

## Latest verified seal (this environment)
```
New Merkle root (SHA-256, 64 hex):
bce5913aedcb012ca7016a2cbc89ce06f6d92ca6030639edf12acb5e3f95357a
```
Router used: `sabre_routing.SabreRouter`
