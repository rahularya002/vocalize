#!/usr/bin/env bash
# Stop nginx (8000) + anything on 8001/8002 (uvicorn), even if not started by start-all.sh.

set -euo pipefail

PID_DIR="${PID_DIR:-/tmp/rag-builder-stack}"
NGINX_PID_FILE="${NGINX_PID_FILE:-/tmp/nginx-runpod.pid}"

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

stop_pidfile() {
  local f=$1
  if [[ -f "$f" ]]; then
    local pid
    pid=$(cat "$f" 2>/dev/null || true)
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
      sleep 1
      kill -KILL "$pid" 2>/dev/null || true
    fi
    rm -f "$f"
  fi
}

if [[ -f "$NGINX_PID_FILE" ]]; then
  pid=$(cat "$NGINX_PID_FILE" 2>/dev/null || true)
  if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "Stopping nginx (pid $pid)..."
    kill -TERM "$pid" 2>/dev/null || true
    sleep 1
    kill -KILL "$pid" 2>/dev/null || true
  fi
  rm -f "$NGINX_PID_FILE"
fi

stop_pidfile "$PID_DIR/product-rag.pid"
stop_pidfile "$PID_DIR/vocalize.pid"

echo "Freeing any remaining listeners on 8001, 8002, 8000..."
kill_port 8001
kill_port 8002
kill_port 8000

echo "Stopped (nginx + uvicorn on 8000/8001/8002)."
