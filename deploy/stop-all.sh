#!/usr/bin/env bash
# Stop nginx (8000) + both uvicorn stacks started by start-all.sh.

set -euo pipefail

PID_DIR="${PID_DIR:-/tmp/rag-builder-stack}"
NGINX_PID_FILE="${NGINX_PID_FILE:-/tmp/nginx-runpod.pid}"

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

echo "Stopped (nginx + uvicorn pids from $PID_DIR)."
