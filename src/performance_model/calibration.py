"""Calibration utilities with parameter-governed fitting."""

from __future__ import annotations

from typing import Any

import numpy as np
from scipy.optimize import least_squares

from .engine import simulate_scenario
from .governance import FITTED_PARAMETERS, governance_payload
from .schemas import CalibrationRequest, ModelScenario

PARAM_BOUNDS: dict[str, tuple[float, float]] = {
    "alpha": (0.1, 10.0),
    "beta": (0.01, 3.0),
    "lambda0": (0.0, 5.0),
    "gamma": (0.0, 5.0),
}


def _fit_params(request: CalibrationRequest) -> list[str]:
    fit_parameters = request.fit_parameters or list(FITTED_PARAMETERS)
    invalid = sorted(set(fit_parameters) - set(FITTED_PARAMETERS))
    if invalid:
        invalid_str = ", ".join(invalid)
        raise ValueError(f"unsupported fit parameter(s): {invalid_str}")
    return fit_parameters


def _scenario_with_fit_values(base: ModelScenario, fit_parameters: list[str], values: np.ndarray) -> ModelScenario:
    data = base.model_dump()
    for idx, param in enumerate(fit_parameters):
        data[param] = float(values[idx])
    return ModelScenario.model_validate(data)


def calibrate(request: CalibrationRequest) -> dict[str, Any]:
    fit_parameters = _fit_params(request)

    observations = sorted(request.observations, key=lambda p: p.time)
    obs_times = np.array([pt.time for pt in observations], dtype=float)
    obs_output = np.array([pt.output for pt in observations], dtype=float)

    x0 = []
    lower = []
    upper = []

    for param in fit_parameters:
        initial = float(getattr(request.scenario, param))
        if request.initial_guess and param in request.initial_guess:
            initial = float(request.initial_guess[param])

        lo, hi = PARAM_BOUNDS[param]
        x0.append(float(np.clip(initial, lo, hi)))
        lower.append(lo)
        upper.append(hi)

    x0_arr = np.array(x0, dtype=float)
    lower_arr = np.array(lower, dtype=float)
    upper_arr = np.array(upper, dtype=float)

    def residuals(values: np.ndarray) -> np.ndarray:
        candidate = _scenario_with_fit_values(request.scenario, fit_parameters, values)
        sim = simulate_scenario(candidate, mode="deterministic", runs=1)

        sim_times = np.array([pt["time"] for pt in sim["trajectory"]], dtype=float)
        sim_output = np.array([pt["output"] for pt in sim["trajectory"]], dtype=float)

        predicted = np.interp(obs_times, sim_times, sim_output)
        return predicted - obs_output

    result = least_squares(
        residuals,
        x0=x0_arr,
        bounds=(lower_arr, upper_arr),
        max_nfev=request.max_nfev,
    )

    fit_values = result.x
    fit_map = {fit_parameters[i]: float(fit_values[i]) for i in range(len(fit_parameters))}

    final_residuals = residuals(fit_values)
    rmse = float(np.sqrt(np.mean(np.square(final_residuals))))
    mae = float(np.mean(np.abs(final_residuals)))

    return {
        "fit_parameters": fit_parameters,
        "fitted_parameters": fit_map,
        "rmse": rmse,
        "mae": mae,
        "success": bool(result.success),
        "message": str(result.message),
        "nfev": int(result.nfev),
        "parameter_governance": governance_payload(),
    }
