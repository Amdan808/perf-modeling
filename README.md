# Performance Under Pressure — Executable Model

This repository contains an executable implementation of the **Performance Under Pressure** model:

- A Python backend (FastAPI) that simulates performance trajectories, evaluates outcomes, calibrates selected parameters, and computes sensitivity rankings.
- A TypeScript web dashboard (React + Vite) for interactive scenario analysis and intervention comparison.
- The original conceptual model document in `performance_model.md`.

## Repository layout

```text
.
├── performance_model.md          # conceptual model and assumptions
├── src/performance_model/        # backend package
├── tests/                        # backend tests
└── web/                          # frontend dashboard
```

## Tech stack

### Backend

- Python 3.12+
- FastAPI + Pydantic v2
- NumPy + SciPy
- Pytest

### Frontend

- React 19 + TypeScript + Vite
- Recharts
- `openapi-typescript` for typed API contracts

## Quick start

### 1) Backend setup

From repository root:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Run the API:

```bash
uvicorn performance_model.main:app --app-dir src --host 127.0.0.1 --port 8000
```

Open API docs:

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

### 2) Frontend setup

From `web/`:

```bash
npm install
npm run dev
```

The dashboard defaults to API base URL `http://127.0.0.1:8000`.

## Backend API reference

### `GET /health`

Health check.

### `GET /parameter-governance`

Returns parameter governance split:

- Scenario inputs (set by conditions/introspection)
- Fitted parameters (currently: `alpha`, `beta`, `lambda0`, `gamma`)

### `POST /simulate`

Runs simulation for a scenario.

- Request: `SimulateRequest`
- Response: `SimulationResponse` (summary + trajectory + feedback + optional distribution)

### `POST /evaluate`

Evaluates outcome probability from `omega`, `theta`, and extrinsic factors.

### `POST /calibrate`

Fits allowed behavioral parameters to observed output points.

- Rejects unsupported `fit_parameters` with HTTP 400.

### `POST /sensitivity`

Computes local sensitivity ranking for selected parameters.

### `POST /compare-interventions`

Compares baseline scenario with intervention scenarios and returns deltas.

## Model implementation notes

- The model feedback loop is computationally closed with explicit bounded functions for:
  - `g(Ω, θ, X)` via outcome probability mapping
  - `ψ = f(p, ρ, ι)` via perceived consequence reality
- Deadline behavior uses a smooth terminal gate instead of a hard discontinuity.
- `D_max -> D(S) -> F(S)` coupling is implemented in the focus/distraction path.
- Calibration governance constrains fitting to behavioral parameters only.

## Development workflow

### Backend checks

From repository root:

```bash
. .venv/bin/activate
pytest -q
```

### Frontend checks

From `web/`:

```bash
npm run lint
npm run build
```

## Regenerating frontend API types

If backend request/response schemas change:

```bash
# from repository root
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

## Known notes

- Frontend build is now split into `react`, `charts`, and `vendor` chunks via `web/vite.config.ts` to keep initial app payload smaller.
