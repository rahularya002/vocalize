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

if [[ ! -d "$PRODUCT_DIR" ]]; then
  echo "ERROR: PRODUCT_DIR is not a directory: $PRODUCT_DIR"
  exit 1
fi
if [[ ! -d "$BUILDER_DIR" ]]; then
  echo "ERROR: BUILDER_DIR is not a directory: $BUILDER_DIR"
  exit 1
fi

# product-rag: many repos use app.py + variable `app`, not main:app
if [[ -z "${PRODUCT_MODULE:-}" ]]; then
  if [[ -f "$PRODUCT_DIR/app.py" ]]; then
    PRODUCT_MODULE="app:app"
  elif [[ -f "$PRODUCT_DIR/main.py" ]]; then
    PRODUCT_MODULE="main:app"
  else
    echo "ERROR: No app.py or main.py in $PRODUCT_DIR. Set PRODUCT_MODULE (e.g. app:app or main:app)."
    exit 1
  fi
fi

if [[ -z "${BUILDER_MODULE:-}" ]]; then
  if [[ -f "$BUILDER_DIR/main.py" ]]; then
    BUILDER_MODULE="main:app"
  elif [[ -f "$BUILDER_DIR/app.py" ]]; then
    BUILDER_MODULE="app:app"
  else
    BUILDER_MODULE="main:app"
  fi
fi

PID_DIR="${PID_DIR:-/tmp/rag-builder-stack}"
mkdir -p "$PID_DIR"

# CORS for a Vercel frontend (inherited by uvicorn on 8001):
#   CORS_ORIGINS — production custom domains, comma-separated, e.g.
#     https://myapp.com,https://www.myapp.com
#   CORS_ALLOW_VERCEL_PREVIEWS — default true: allows any https://*.vercel.app (previews + default *.vercel.app URL)
#   CORS_ALLOW_ALL=true — set Access-Control-Allow-Origin: * on the API (use if browser still shows CORS + null status)
export CORS_ALLOW_VERCEL_PREVIEWS="${CORS_ALLOW_VERCEL_PREVIEWS:-true}"
[[ -n "${CORS_ORIGINS:-}" ]] && export CORS_ORIGINS
[[ -n "${CORS_ALLOW_ALL:-}" ]] && export CORS_ALLOW_ALL

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

echo "Starting product-rag on 8002: $PRODUCT_DIR (uvicorn $PRODUCT_MODULE)"
(
  cd "$PRODUCT_DIR" || exit 1
  nohup uvicorn "$PRODUCT_MODULE" --host 0.0.0.0 --port 8002 >>"$PID_DIR/product-rag.log" 2>&1 &
  echo $! >"$PID_DIR/product-rag.pid"
)

echo "Starting RAG builder on 8001: $BUILDER_DIR (uvicorn $BUILDER_MODULE)"
(
  cd "$BUILDER_DIR" || exit 1
  nohup uvicorn "$BUILDER_MODULE" --host 0.0.0.0 --port 8001 >>"$PID_DIR/vocalize.log" 2>&1 &
  echo $! >"$PID_DIR/vocalize.pid"
)

sleep 3
nginx -t -c "$NGINX_CONF"
echo "Starting nginx on 8000..."
nginx -c "$NGINX_CONF"

echo "Done."
echo "  Logs: $PID_DIR/product-rag.log  $PID_DIR/vocalize.log"
echo "  Test: curl -sS http://127.0.0.1:8000/health/builder"
echo "  Stop: ./deploy/stop-all.sh"

if command -v curl >/dev/null 2>&1; then
  echo ""
  code2=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:8002/docs" 2>/dev/null || true)
  code2=${code2:-000}
  code1=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:8001/health" 2>/dev/null || true)
  code1=${code1:-000}
  if [[ "$code2" != "200" && "$code2" != "307" ]]; then
    echo "WARNING: product-rag on :8002 not OK (HTTP $code2 for /docs). Public / and /docs → 502."
    echo "         Check: uvicorn module is correct (often app:app if app.py). Set PRODUCT_MODULE if the ASGI instance is not named 'app'."
    echo "         Log: tail -80 $PID_DIR/product-rag.log"
  fi
  if [[ "$code1" != "200" ]]; then
    echo "WARNING: vocalize on :8001 /health → HTTP $code1. tail -80 $PID_DIR/vocalize.log"
  fi
fi
