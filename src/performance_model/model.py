"""Core model equations and bounded helper functions."""

from __future__ import annotations

import numpy as np

from .schemas import ModelScenario

EPS = 1e-9


def sigmoid(x: np.ndarray | float) -> np.ndarray | float:
    x_arr = np.asarray(x)
    out = np.where(
        x_arr >= 0,
        1.0 / (1.0 + np.exp(-x_arr)),
        np.exp(x_arr) / (1.0 + np.exp(x_arr)),
    )
    if np.isscalar(x):
        return float(out)
    return out


def potential_factor(s: ModelScenario) -> float:
    return float(s.iota * (s.R_s * s.R_f) * (1.0 + s.rho))


def lambda_of_c(s: ModelScenario) -> float:
    return float(s.lambda0 * np.exp(-s.gamma * s.C))


def focus_threshold_xp(s: ModelScenario) -> float:
    return float(s.X_p0 / (1.0 + s.sigma_task))


def distraction_max(s: ModelScenario) -> float:
    return float(s.D0 * (1.0 + s.eta * s.N_d))


def distraction_level(stress: np.ndarray, xp: float, dmax: float) -> np.ndarray:
    xp_safe = max(xp, EPS)
    raw = np.where(stress < xp_safe, dmax * (1.0 - (stress / xp_safe)), 0.0)
    return np.clip(raw, 0.0, None)


def focus_factor(stress: np.ndarray, s: ModelScenario) -> tuple[np.ndarray, np.ndarray, float, float]:
    xp = focus_threshold_xp(s)
    dmax = distraction_max(s)

    base_focus = np.clip(stress / max(xp, EPS), 0.0, 1.0)
    distraction = distraction_level(stress, xp, dmax)

    # D_max is now structurally coupled into focus via distraction suppression.
    focus = np.clip(base_focus * np.exp(-s.distraction_impact * distraction), 0.0, 1.0)
    return focus, distraction, xp, dmax


def smooth_terminal_gate(times: np.ndarray, t_start: float, t_f: float) -> np.ndarray:
    span = max(t_f - t_start, EPS)
    remaining = np.clip((t_f - times) / span, 0.0, 1.0)
    return remaining * remaining * (3.0 - 2.0 * remaining)


def outcome_probability(omega: float, theta: float, extrinsic_x: float, probability_gain: float) -> float:
    scale = max(abs(theta), 1.0)
    z = probability_gain * (((omega - theta) / scale) + extrinsic_x)
    return float(np.clip(sigmoid(z), 0.0, 1.0))


def perceived_consequence_reality(
    probability: float,
    rho: float,
    iota: float,
    psi_gain: float,
    psi_midpoint: float,
) -> float:
    p = float(np.clip(probability, 0.0, 1.0))
    rho_c = float(np.clip(rho, 0.0, 1.0))
    iota_c = float(np.clip(iota, 0.0, 1.0))
    midpoint = float(np.clip(psi_midpoint, 0.0, 1.0))

    stake_anchor = 0.25 + 0.75 * ((rho_c + iota_c) / 2.0)
    response = float(sigmoid(psi_gain * (p - midpoint)))

    return float(np.clip(stake_anchor * response, 0.0, 1.0))
