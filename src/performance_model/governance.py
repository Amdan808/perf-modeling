"""Parameter governance for calibration and scenario design."""

from __future__ import annotations

SCENARIO_INPUT_PARAMETERS = (
    "iota",
    "rho",
    "R_s",
    "R_f",
    "C",
    "t_start",
    "t_f",
    "delta",
    "X_p0",
    "sigma_task",
    "D0",
    "N_d",
    "eta",
    "distraction_impact",
    "sigma0",
    "sigma1",
    "theta",
    "extrinsic_x",
    "probability_gain",
    "psi_gain",
    "psi_midpoint",
)

FITTED_PARAMETERS = ("alpha", "beta", "lambda0", "gamma")


def governance_payload() -> dict[str, object]:
    return {
        "scenario_inputs": list(SCENARIO_INPUT_PARAMETERS),
        "fitted_parameters": list(FITTED_PARAMETERS),
        "notes": (
            "Scenario inputs are set by introspection/conditions; "
            "calibration only estimates behavioral parameters."
        ),
    }
