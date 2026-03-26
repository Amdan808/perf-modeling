# Performance Model Web Dashboard (Phase 2)

This React + TypeScript dashboard is the Phase 2 interface for the backend model API.

It provides:

- Scenario parameter controls with presets
- Simulation visualization (`/simulate`)
- Sensitivity ranking (`/sensitivity`)
- Baseline vs intervention comparison (`/compare-interventions`)
- Scenario JSON import/export
- Parameter governance display (`/parameter-governance`)

## Stack

- React 19 + TypeScript + Vite
- Recharts for plotting
- `openapi-typescript` for typed API contracts

## Prerequisites

- Python backend dependencies installed in repository root (`.venv`)
- Node.js and npm installed

## Run backend

From repository root:

```bash
. .venv/bin/activate
uvicorn performance_model.main:app --app-dir src --host 127.0.0.1 --port 8000
```

## Run frontend

From `web/`:

```bash
npm install
npm run dev
```

The app defaults to `http://127.0.0.1:8000` as API base URL.
You can change it in the dashboard input.

## Regenerate typed API definitions

If backend schemas change, regenerate:

```bash
# from repo root
. .venv/bin/activate
PYTHONPATH=src python - <<'PY'
import json
from performance_model.main import app
with open('web/src/api/openapi.json', 'w', encoding='utf-8') as f:
    json.dump(app.openapi(), f, indent=2)
PY

# from web/
npm run generate:api
```

## Verify frontend

```bash
npm run lint
npm run build
```

## Project-level documentation

For backend API overview, architecture context, and full run workflow, see:

- `../README.md`
