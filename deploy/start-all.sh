#!/usr/bin/env bash
# One-shot start: product-rag (8002) + RAG builder (8001) + nginx (8000).
# Run on the RunPod box from bash (after: chmod +x deploy/start-all.sh).
#
# Usage:
#   ./deploy/start-all.sh
#   ./deploy/start-all.sh --free-8000    # kill listeners on 8000 first
#   ./deploy/start-all.sh --free-all     # kill 8000 + 8001 + 8002 (clean slate)
#
# Override paths if your layout differs:
#   PRODUCT_DIR=/workspace/product-rag/backend BUILDER_DIR=/workspace/vocalize/backend ./deploy/start-all.sh

set -euo pipefail

FREE_8000=false
FREE_ALL=false
for arg in "$@"; do
  case "$arg" in
    --free-8000) FREE_8000=true ;;
    --free-all) FREE_ALL=true; FREE_8000=true ;;
  esac
done

WORKSPACE="${WORKSPACE:-/workspace}"
PRODUCT_DIR="${PRODUCT_DIR:-$WORKSPACE/product-rag/backend}"
BUILDER_DIR="${BUILDER_DIR:-$WORKSPACE/vocalize/backend}"
NGINX_CONF="${NGINX_CONF:-$WORKSPACE/vocalize/deploy/nginx-runpod.conf}"
if [[ ! -f "$NGINX_CONF" ]]; then
  NGINX_CONF="$WORKSPACE/rag-builder/deploy/nginx-runpod.conf"
fi

PRODUCT_MODULE="${PRODUCT_MODULE:-main:app}"
BUILDER_MODULE="${BUILDER_MODULE:-main:app}"

PID_DIR="${PID_DIR:-/tmp/rag-builder-stack}"
mkdir -p "$PID_DIR"

# CORS for a Vercel frontend (inherited by uvicorn on 8001):
#   CORS_ORIGINS — production custom domains, comma-separated, e.g.
#     https://myapp.com,https://www.myapp.com
#   CORS_ALLOW_VERCEL_PREVIEWS — default true: allows any https://*.vercel.app (previews + default *.vercel.app URL)
export CORS_ALLOW_VERCEL_PREVIEWS="${CORS_ALLOW_VERCEL_PREVIEWS:-true}"
[[ -n "${CORS_ORIGINS:-}" ]] && export CORS_ORIGINS

# Free a TCP listen port (fuser / lsof / ss — works without psmisc on minimal images).
kill_port() {
  local p=$1
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${p}/tcp" 2>/dev/null || true
    sleep 1
    return 0
  fi
  if command -v lsof >/dev/null 2>&1; then
    mapfile -t pids < <(lsof -t -iTCP:"$p" -sTCP:LISTEN 2>/dev/null || true)
    if ((${#pids[@]})); then
      kill -TERM "${pids[@]}" 2>/dev/null || true
      sleep 1
    fi
    return 0
  fi
  # ss is from iproute2 (usually present); parse pid=12345 from users:(("name",pid=123,fd=…))
  mapfile -t pids < <(ss -tlnp 2>/dev/null | grep -E ":${p}\\b" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u)
  if ((${#pids[@]})); then
    kill -TERM "${pids[@]}" 2>/dev/null || true
    sleep 1
    mapfile -t pids < <(ss -tlnp 2>/dev/null | grep -E ":${p}\\b" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u)
    if ((${#pids[@]})); then
      kill -KILL "${pids[@]}" 2>/dev/null || true
      sleep 1
    fi
  fi
}

if [[ "$FREE_ALL" == true ]]; then
  echo "Freeing ports 8000, 8001, 8002..."
  kill_port 8001
  kill_port 8002
  kill_port 8000
elif [[ "$FREE_8000" == true ]]; then
  echo "Freeing port 8000..."
  kill_port 8000
fi

if [[ ! -f "$NGINX_CONF" ]]; then
  echo "nginx config not found: $NGINX_CONF"
  echo "Set NGINX_CONF or clone repo so deploy/nginx-runpod.conf exists."
  exit 1
fi

if ss -tln 2>/dev/null | grep -qE ':8001\b'; then
  echo "Port 8001 already in use (builder?). Stop it first: ./deploy/stop-all.sh"
  exit 1
fi
if ss -tln 2>/dev/null | grep -qE ':8002\b'; then
  echo "Port 8002 already in use (product-rag?). Stop it first: ./deploy/stop-all.sh"
  exit 1
fi

if ss -tln 2>/dev/null | grep -qE ':8000\b'; then
  echo "Port 8000 is already in use. nginx cannot start."
  echo "Stop the old server or re-run with: $0 --free-8000"
  exit 1
fi

echo "Starting product-rag on 8002: $PRODUCT_DIR"
(
  cd "$PRODUCT_DIR"
  nohup uvicorn "$PRODUCT_MODULE" --host 0.0.0.0 --port 8002 >>"$PID_DIR/product-rag.log" 2>&1 &
  echo $! >"$PID_DIR/product-rag.pid"
)

echo "Starting RAG builder on 8001: $BUILDER_DIR"
(
  cd "$BUILDER_DIR"
  nohup uvicorn "$BUILDER_MODULE" --host 0.0.0.0 --port 8001 >>"$PID_DIR/vocalize.log" 2>&1 &
  echo $! >"$PID_DIR/vocalize.pid"
)

sleep 2
nginx -t -c "$NGINX_CONF"
echo "Starting nginx on 8000..."
nginx -c "$NGINX_CONF"

echo "Done."
echo "  Logs: $PID_DIR/product-rag.log  $PID_DIR/vocalize.log"
echo "  Test: curl -sS http://127.0.0.1:8000/health/builder"
echo "  Stop: ./deploy/stop-all.sh"
