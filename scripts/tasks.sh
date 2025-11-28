#!/usr/bin/env bash
set -euo pipefail

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  source "$HOME/.nvm/nvm.sh"
  nvm use 20 >/dev/null 2>&1 || true
fi

NETWORK=""
TYPE=""
STEPS=()

usage() {
  echo "Usage: bash scripts/tasks.sh --network <name> --type <deploy|upgrade> --steps <step1> [step2 ...]"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --network)
      NETWORK="$2"; shift 2 ;;
    --type)
      TYPE="$2"; shift 2 ;;
    --steps|--step)
      shift
      while [[ $# -gt 0 && "$1" != --* ]]; do
        STEPS+=("$1")
        shift
      done
      ;;
    *)
      echo "Unknown argument: $1"; usage ;;
  esac
done

if [[ -z "$NETWORK" || -z "$TYPE" || ${#STEPS[@]} -eq 0 ]]; then
  usage
fi

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEARCH_DIRS=("$BASE_DIR/$TYPE")

resolve_step() {
  local name="$1"
  # direct path
  if [ -f "$name" ]; then
    echo "$name"
    return 0
  fi
  local fname="$name"
  [[ "$fname" != *.js ]] && fname="${fname}.js"
  for dir in "${SEARCH_DIRS[@]}"; do
    if [ -f "$dir/$fname" ]; then
      echo "$dir/$fname"
      return 0
    fi
  done
  echo "ERROR" >&2
  return 1
}

RESOLVED_STEPS=()
for s in "${STEPS[@]}"; do
  path=$(resolve_step "$s") || { echo "Step not found: $s (searched in ${SEARCH_DIRS[*]})"; exit 1; }
  RESOLVED_STEPS+=("$path")
done

for step in "${RESOLVED_STEPS[@]}"; do
  echo "================================================================"
  echo "Running script: $step (network: $NETWORK)"
  echo "================================================================"
  npx hardhat run --network "$NETWORK" "$step"
  echo
done

echo "================================================================"
echo "tasks completed (network: $NETWORK)"
echo "================================================================"
