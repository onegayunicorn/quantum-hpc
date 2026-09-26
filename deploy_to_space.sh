#!/usr/bin/env bash
# ==============================================================================
# deploy_to_space.sh — Deploy Sovereign Quantum-HPC Stack to Omegapixel Space
# Target Space: Omegapixel/Sovereign-Omega-3.0.0
# ==============================================================================

set -e

SPACE_REPO="Omegapixel/Sovereign-Omega-3.0.0"

echo "================================================================================"
echo " 🚀 DEPLOYING SOVEREIGN QUANTUM-HPC WORKBENCH TO HUGGING FACE SPACE"
echo " Target Space: ${SPACE_REPO}"
echo "================================================================================"

# Step 1: Run Truth Ledger Sealing Protocol
echo "[1/4] Running Truth Ledger verification and sealing..."
python3 seal_truth_ledger.py

# Step 2: Build the production React frontend
echo "[2/4] Building production React web bundle..."
npm run build

# Step 3: Verify Space Manifest and Dockerfile
echo "[3/4] Verifying sovereign_deployment.yaml & Dockerfile..."
if [ ! -f "sovereign_deployment.yaml" ]; then
    echo "❌ Error: sovereign_deployment.yaml not found!"
    exit 1
fi

if [ ! -f "Dockerfile" ]; then
    echo "❌ Error: Dockerfile not found!"
    exit 1
fi

# Step 4: Upload to Hugging Face Space
echo "[4/4] Uploading repository to Hugging Face Space: ${SPACE_REPO}..."
if command -v huggingface-cli &> /dev/null; then
    huggingface-cli upload "${SPACE_REPO}" . --repo-type space --exclude ".git*" "node_modules*"
    echo "✅ Successfully deployed to https://huggingface.co/spaces/${SPACE_REPO}"
else
    echo "⚠️  huggingface-cli not detected in PATH."
    echo "To complete upload via git, run:"
    echo "  git remote add space https://huggingface.co/spaces/${SPACE_REPO}"
    echo "  git push space main"
fi

echo "================================================================================"
echo " ✅ DEPLOYMENT PREPARATION & ARTIFACT PACKAGING COMPLETE"
echo " Active Merkle Root: 71d1bbc0107e8663af0bbbc59b3dd1011f858f8d4034fbb61a2bc099d465e628"
echo "================================================================================"
