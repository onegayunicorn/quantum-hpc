"""api.py — FastAPI bridge. Dynamic merkle root read + transparent evidence labeling."""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json, os

app = FastAPI(title="Sovereign Quantum-HPC API", version="3.0.0")
LEDGER = "ledger_event_VERIFIED_HPC_SIMULATION.json"

class CompileRequest(BaseModel):
    qasm: str; topology: str = "ibm_27q_falcon"; lookahead: int = 3

def live_root():
    if os.path.exists(LEDGER):
        try:
            with open(LEDGER) as f:
                return json.load(f)["digital_twin"]["new_merkle_root"]
        except Exception: return "ledger_corrupted"
    return "no_ledger_sealed_yet"

@app.get("/health")
def health():
    return {"status":"ok","twin_id":"8c34c4e2de","merkle_root":live_root(),
            "evidence_level":"live_cryptographic_state"}

@app.post("/api/compile")
def compile_qasm(r: CompileRequest):
    return {"status":"success","evidence_level":"simulated",
            "message":"QLLVM pipeline (simulated) — full engine integration pending",
            "topology":r.topology,"lookahead":r.lookahead,"qasm_length":len(r.qasm)}

@app.get("/api/ledger")
def ledger():
    if os.path.exists(LEDGER):
        with open(LEDGER) as f: return json.load(f)
    raise HTTPException(404, "Run seal_truth_ledger.py first")
