#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   run_with_env.sh <env_file> <rpc_var_name> [script_target ...]
#   - If no script_target or first is "full", runs the default one-shot pipeline DeployFullTN.
#   - script_target accepts either path or path:ContractName.
ENV_FILE=${1:?env file required}
RPC_VAR=${2:?rpc var name required}
shift 2

DEFAULT_TARGETS=("script/DeployFullTN.s.sol:DeployFullTN")

TARGETS=()
EXTRA_ARGS=()
for arg in "$@"; do
  if [[ "$arg" == --* ]]; then
    EXTRA_ARGS+=("$arg")
  else
    TARGETS+=("$arg")
  fi
done

if [ ${#TARGETS[@]} -eq 0 ] || [ "${TARGETS[0]}" = "full" ]; then
  TARGETS=("${DEFAULT_TARGETS[@]}")
fi
if [ ${#EXTRA_ARGS[@]} -eq 0 ]; then
  EXTRA_ARGS=(--legacy)
fi
if [[ " ${EXTRA_ARGS[*]} " == *" --resume "* ]]; then
  script_path="${TARGETS[0]%:*}"
  script_name="$(basename "$script_path")"
  broadcast_dir="broadcast/$script_name"
  if ! ls "$broadcast_dir"/*/run-latest.json >/dev/null 2>&1; then
    echo "No previous broadcast found for $script_name; removing --resume" >&2
    tmp=()
    for arg in "${EXTRA_ARGS[@]}"; do
      if [ "$arg" != "--resume" ]; then
        tmp+=("$arg")
      fi
    done
    EXTRA_ARGS=("${tmp[@]}")
  fi
fi
if [ -n "${FORGE_ARGS:-}" ]; then
  # shellcheck disable=SC2206
  EXTRA_ARGS+=(${FORGE_ARGS})
fi

# Ensure forge is on PATH if installed in default location
if ! command -v forge >/dev/null 2>&1 && [ -x "$HOME/.foundry/bin/forge" ]; then
  export PATH="$HOME/.foundry/bin:$PATH"
fi
if ! command -v forge >/dev/null 2>&1; then
  echo "forge not found. Install Foundry (https://book.getfoundry.sh/getting-started/installation) or ensure forge is on PATH." >&2
  exit 127
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a
RPC_URL=${!RPC_VAR:-}
if [ -z "$RPC_URL" ]; then
  echo "RPC var $RPC_VAR is empty in $ENV_FILE" >&2
  exit 1
fi

# Hint forge to tolerate parity-style receipts that may miss type fields
export ETH_RPC_KIND=parity
export FOUNDRY_ETH_RPC_KIND=parity
export ETH_RPC_URL="$RPC_URL"

for target in "${TARGETS[@]}"; do
  echo "Running $target ..."
  forge script "$target" --fork-url "$RPC_URL" --broadcast "${EXTRA_ARGS[@]}"
done
