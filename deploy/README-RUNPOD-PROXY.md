# RunPod: one public port (8000), two backends

RunPod often maps the public URL to **one** container port (e.g. `8000`). To run **product-rag** and **this API (vocalize / rag-builder)** on the same pod, use **nginx** on `8000` and run each FastAPI app on **different internal ports**.

## SSH into the pod (RunPod)

From your **own** machine (PowerShell / WSL / macOS terminal), use the host RunPod gives you, for example:

```bash
ssh 3msf2my21g1zl4-64410b32@ssh.runpod.io -i ~/.ssh/id_ed25519
```

On **Windows PowerShell**, if `~` does not expand, use:

```powershell
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" 3msf2my21g1zl4-64410b32@ssh.runpod.io
```

Some automation environments cannot allocate a PTY; RunPod may show `Your SSH client doesn't support PTY` in that case—use a normal local terminal instead.

## Quick checks inside SSH (time / clock)

```bash
date
date -u
```

Time how long nginx stays up until you stop it (`Ctrl+C`):

```bash
time nginx -c /workspace/vocalize/deploy/nginx-runpod.conf -g 'daemon off;'
```

(Adjust the path if your clone is `rag-builder` instead of `vocalize`.)

## Ports

| Service        | Internal port | Public path (via nginx on 8000)        |
|----------------|---------------|----------------------------------------|
| nginx          | **8000**      | (this is what RunPod exposes)          |
| RAG Builder    | 8001          | `/assistant/*`, `/models`, `/health/builder` |
| Product RAG    | 8002          | everything else (`/`, `/stream`, …)    |

### 502 Bad Gateway on `https://…/docs`

The public path **`/docs`** is routed to **product-rag** (**port 8002**), not Vocalize. **502** means nginx could not get a valid response from **8002** (process not running, wrong `main:app`, crash on import, etc.).

On the pod:

```bash
tail -80 /tmp/rag-builder-stack/product-rag.log
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8002/docs
```

**Vocalize (RAG builder) Swagger** is only on **8001** from inside the pod:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8001/docs
```

There is no public `…/docs` for Vocalize in the default nginx split unless you add a dedicated path or a second proxy port.

## Easiest: one command (after nginx is installed)

From the repo root on the pod (`vocalize` or `rag-builder`):

```bash
chmod +x deploy/start-all.sh deploy/stop-all.sh
./deploy/start-all.sh --free-8000   # frees port 8000, then starts 8002 + 8001 + nginx
```

Stop everything:

```bash
./deploy/stop-all.sh
```

Set `PRODUCT_DIR`, `BUILDER_DIR`, or `CORS_ORIGINS` in the shell before `./deploy/start-all.sh` if paths differ (see script header).

**Simplest overall (no nginx):** run only vocalize on a **second** RunPod pod on port 8000 and point Vercel `NEXT_PUBLIC_API_URL` at that URL.

## 1. Install nginx (once)

```bash
apt-get update && apt-get install -y nginx
```

## 2. Start the two APIs (tmux recommended)

**Terminal A — product-rag** (example; use its real module path):

```bash
cd /workspace/product-rag/backend
uvicorn main:app --host 0.0.0.0 --port 8002
```

**Terminal B — RAG Builder (vocalize)**:

```bash
cd /workspace/vocalize/backend
export CORS_ORIGINS="https://your-app.vercel.app"
export RUNPOD_BASE_URL="https://YOUR-PRODUCT-RAG-PROXY-URL"   # optional; only if cloud demo should hit product-rag by public URL
uvicorn main:app --host 0.0.0.0 --port 8001
```

> If **cloud demo** should call product-rag on the **same machine**, set `RUNPOD_BASE_URL` to `http://127.0.0.1:8002` only if that backend accepts local traffic the same way; otherwise keep your existing public Runpod URL for the demo RAG.

## 3. Start nginx with this config

From the repo root (adjust path if needed):

```bash
nginx -c /workspace/vocalize/deploy/nginx-runpod.conf -g 'daemon off;'
```

Or if you cloned as `rag-builder`:

```bash
nginx -c /workspace/rag-builder/deploy/nginx-runpod.conf -g 'daemon off;'
```

## 4. Point Vercel at the **same** RunPod URL

`NEXT_PUBLIC_API_URL` should be your RunPod proxy base **without** a path, e.g. `https://xxxxx-8000.proxy.runpod.net`

The browser will call:

- `…/assistant/...` and `…/models` → RAG Builder (8001)
- `…/stream`, `…/ask`, etc. → product-rag (8002)

## Health checks

- **RAG Builder**: `GET https://YOUR-POD/health/builder`
- **Product RAG**: `GET https://YOUR-POD/health` (if that app defines `/health`; otherwise use its docs or add a route)

## If `/health` on product-rag conflicts

This config uses **`/health/builder`** for the builder API so product-rag can keep **`/health`** on the default `location /` if you add it there.
