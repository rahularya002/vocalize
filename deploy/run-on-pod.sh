#!/usr/bin/env bash
# Paste into RunPod SSH after: chmod +x deploy/run-on-pod.sh && ./deploy/run-on-pod.sh
# Or run commands manually from README-RUNPOD-PROXY.md

set -euo pipefail

BUILDER_PORT="${BUILDER_PORT:-8001}"
PRODUCT_PORT="${PRODUCT_PORT:-8002}"
NGINX_CONF="${NGINX_CONF:-/workspace/vocalize/deploy/nginx-runpod.conf}"

if [[ ! -f "$NGINX_CONF" ]]; then
  NGINX_CONF="/workspace/rag-builder/deploy/nginx-runpod.conf"
fi

echo "=== Server time ==="
date -u
date

echo "=== Test nginx config ==="
nginx -t -c "$NGINX_CONF"

echo "=== Start nginx on 8000 (foreground). Stop with Ctrl+C. ==="
echo "Config: $NGINX_CONF"
# `time` prints real/user/sys when nginx exits (Ctrl+C)
time nginx -c "$NGINX_CONF" -g 'daemon off;'
