# Performance Under Pressure — Executable Mathematical Model

This project started as an observation linking psychology and mathematics:
performance can become sharper and more reliable under high-stakes, time-pressured conditions.

The repository turns that idea into a runnable system you can inspect, simulate, and discuss.

## Origin & intent

The model formalizes a self-observed pattern:

- Output often stays low during long horizons.
- Performance rises steeply near hard deadlines.
- Stakes, perceived consequence, and focus dynamics shape this curve.

The practical goal is intervention design: engineering conditions that trigger peak performance earlier, rather than waiting for last-minute pressure.

## Non-technical summary

Think of performance like an engine controlled by pressure:

- Too little pressure : slow start and drift, you still have time don't worry 😎.
- Enough pressure : normies lock in and output rises, weirdos are chilling 🤓.
- Too much pressure : overload risk but performance ignites, especially for weirdos like myself 🙀.

This project simulates that curve over time, then estimates how likely the total work is to clear a success threshold.

## What this repository includes

- **Python backend (FastAPI):** simulation, evaluation, calibration, sensitivity ranking, intervention comparison.
- **TypeScript web app (React + Vite):**
  - `Dashboard` mode for interactive analysis.
  - `Public presentation` mode for non-technical explanation.
- **Conceptual reference:** `performance_model.md` (original model narrative and symbols).

## Repository layout

```text
.
├── performance_model.md          # conceptual model and assumptions
├── src/performance_model/        # backend package
├── tests/                        # backend tests
└── web/                          # frontend dashboard
```

## Model at a glance

The system is two-layer:

- **Layer 1: Output engine** models instantaneous performance `P(t)` from stress, capability, focus, fatigue, and noise.
- **Layer 2: Outcome evaluation** maps accumulated output `Ω` against threshold `θ` into success probability `p`.

This implementation closes key logical gaps from the original conceptual draft:

- Explicit bounded `g(Ω, θ, X)` and `ψ = f(p, ρ, ι)` forms.
- Smooth terminal gate near deadline (no hard discontinuity).
- Integrated distraction-focus coupling (`D_max -> D(S) -> F(S)`).
- Parameter governance split between scenario inputs and fitted parameters.

## Quick math examples (illustrative)

### 1) Stress increases as deadline gets closer

`S = (C * psi) / (t_f - t + delta)`

Using `C = 4.2`, `psi = 0.8`, `t_f = 1.0`, `delta = 0.05`:

- At `t = 0.20`: `S = 3.36 / 0.85 ~= 3.95`
- At `t = 0.80`: `S = 3.36 / 0.25 = 13.44`

Same stakes, much higher stress near the deadline.

### 2) More task stimulation lowers focus threshold

`X_p = X_p0 / (1 + sigma_task)`

Using `X_p0 = 8`:

- If `sigma_task = 0.6`, then `X_p = 8 / 1.6 = 5.0`
- If `sigma_task = 1.0`, then `X_p = 8 / 2.0 = 4.0`

Higher stimulation means full focus is reached at lower stress.

### 3) Accumulated output shifts success probability

`p = sigmoid(gain * ((Omega - theta) / |theta| + X))`

Using `theta = 40`, `gain = 6`, `X = 0`:

- If `Omega = 38`, then `p ~= 0.43`
- If `Omega = 44`, then `p ~= 0.65`

A moderate increase in accumulated output can materially raise success odds.

## Tech stack

- Backend: Python 3.12+, FastAPI, Pydantic v2, NumPy, SciPy, Pytest
- Frontend: React 19, TypeScript, Vite, Recharts, `openapi-typescript`

## Quick start

### 1) Start backend

From repository root:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Run the API server:

```bash
uvicorn performance_model.main:app --app-dir src --host 127.0.0.1 --port 8000
```

Open API docs:

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

### 2) Start frontend

From `web/`:

```bash
npm install
npm run dev
```

The web app defaults to API base URL `http://127.0.0.1:8000`.

Open the app and choose either:

- `Dashboard` for simulation, sensitivity, and intervention testing.
- `Public presentation` for a concise narrative suitable for GitHub/public readers.

## Dashboard interface quick guide

The dashboard is graph-first and tuned for focus:

- **Default focus mode:** shows the live equation graph with quick parameter sliders.
- **Simple / Advanced toggle:** switches depth of controls and persists your preference.
- **Backend & Data drawer (`⚙`):** collapsed by default; contains API URL, backend status, import/export, and governance info.
- **Secondary tabs below the fold:** `Sensitivity` and `Interventions` keep analysis tools available without distracting from the main chart.
- **Advanced parameter editor:** stays inside an accordion for progressive disclosure.

Live chart behavior:

- The top chart updates in real time from sliders and plots `P(t)`, `F(t)`, and `S(t)`.
- `Time -> deadline (normalized)` is displayed below the chart for readability.
- The cumulative chart visualizes `Omega(t) = integral P(t) dt` with a line-swatch legend.

## API overview

- `GET /health` — health check
- `GET /parameter-governance` — fixed vs fitted parameter roles
- `POST /simulate` — run deterministic or stochastic scenario simulation
- `POST /evaluate` — compute outcome probability from `omega`, `theta`, and extrinsic factors
- `POST /calibrate` — fit allowed behavioral parameters (`alpha`, `beta`, `lambda0`, `gamma`)
- `POST /sensitivity` — rank local parameter impact
- `POST /compare-interventions` — baseline vs intervention deltas

## Model governance notes

- Scenario inputs (for conditions/introspection): includes values such as `iota`, `rho`, `R_s`, `R_f`.
- Fitted parameters (for calibration): `alpha`, `beta`, `lambda0`, `gamma`.
- Unsupported fit parameters are rejected with HTTP 400 by design.

## Development checks

### Backend

From repository root:

```bash
. .venv/bin/activate
pytest -q
```

### Frontend

From `web/`:

```bash
npm run lint
npm run build
```

## Regenerate frontend API types

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

## Notes

- Frontend build is split into `react`, `charts`, and `vendor` chunks (`web/vite.config.ts`) to keep initial payload smaller.
