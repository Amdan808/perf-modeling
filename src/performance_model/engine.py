"""Simulation engine with feedback closure and sensitivity analysis."""

from __future__ import annotations

from typing import Any

import numpy as np

from .model import (
    EPS,
    focus_factor,
    lambda_of_c,
    outcome_probability,
    perceived_consequence_reality,
    potential_factor,
    smooth_terminal_gate,
)
from .schemas import ModelScenario


def _integrate(values: np.ndarray, times: np.ndarray) -> float:
    if hasattr(np, "trapezoid"):
        return float(np.trapezoid(values, times))
    return float(np.trapz(values, times))


def _simulate_trajectory(
    scenario: ModelScenario,
    psi: float,
    stochastic: bool,
    rng: np.random.Generator,
) -> dict[str, np.ndarray | float]:
    times = np.linspace(scenario.t_start, scenario.t_f, scenario.n_steps)

    phi = potential_factor(scenario)
    lambda_c = lambda_of_c(scenario)

    remaining = np.maximum(scenario.t_f - times, 0.0)
    stress = (scenario.C * psi) / (remaining + scenario.delta)

    focus, distraction, _, _ = focus_factor(stress, scenario)

    activation = np.power(np.maximum(stress, 0.0), scenario.alpha) * np.exp(-scenario.beta * stress)
    fatigue = np.exp(-lambda_c * (times - scenario.t_start))
    baseline = scenario.A * phi * activation * fatigue * focus

    if stochastic:
        sigma = scenario.sigma0 + scenario.sigma1 * stress
        noise = rng.normal(0.0, sigma, size=times.shape)
    else:
        noise = np.zeros_like(times)

    gate = smooth_terminal_gate(times, scenario.t_start, scenario.t_f)
    output = gate * (baseline + noise)
    output = np.maximum(output, 0.0)
    output[-1] = 0.0

    return {
        "times": times,
        "stress": stress,
        "focus": focus,
        "distraction": distraction,
        "gate": gate,
        "output": output,
        "phi": float(phi),
        "lambda_c": float(lambda_c),
    }


def _simulation_from_trajectory(
    mode: str,
    runs: int,
    psi: float,
    trajectory_data: dict[str, np.ndarray | float],
    feedback: list[dict[str, float | int]],
) -> dict[str, Any]:
    times = np.asarray(trajectory_data["times"], dtype=float)
    output = np.asarray(trajectory_data["output"], dtype=float)

    omega = _integrate(output, times)
    p = outcome_probability(
        omega,
        theta=float(trajectory_data.get("theta", 40.0)),
        extrinsic_x=float(trajectory_data.get("extrinsic_x", 0.0)),
        probability_gain=float(trajectory_data.get("probability_gain", 6.0)),
    )

    peak_idx = int(np.argmax(output))

    trajectory = [
        {
            "time": float(times[i]),
            "stress": float(np.asarray(trajectory_data["stress"])[i]),
            "focus": float(np.asarray(trajectory_data["focus"])[i]),
            "distraction": float(np.asarray(trajectory_data["distraction"])[i]),
            "output": float(output[i]),
            "terminal_gate": float(np.asarray(trajectory_data["gate"])[i]),
        }
        for i in range(times.shape[0])
    ]

    return {
        "summary": {
            "omega": float(omega),
            "probability": float(p),
            "psi": float(psi),
            "phi": float(trajectory_data["phi"]),
            "lambda_c": float(trajectory_data["lambda_c"]),
            "peak_output": float(output[peak_idx]),
            "peak_time": float(times[peak_idx]),
            "mode": mode,
            "runs": runs,
        },
        "trajectory": trajectory,
        "feedback": feedback,
        "distribution": None,
    }


def simulate_single_run(
    scenario: ModelScenario,
    mode: str = "deterministic",
    seed: int | None = None,
) -> dict[str, Any]:
    rng = np.random.default_rng(seed)

    p_estimate = 0.5
    feedback: list[dict[str, float | int]] = []

    for step in range(1, scenario.feedback_iterations + 1):
        psi = perceived_consequence_reality(
            probability=p_estimate,
            rho=scenario.rho,
            iota=scenario.iota,
            psi_gain=scenario.psi_gain,
            psi_midpoint=scenario.psi_midpoint,
        )

        det = _simulate_trajectory(scenario, psi=psi, stochastic=False, rng=rng)
        omega = _integrate(np.asarray(det["output"]), np.asarray(det["times"]))
        p_next = outcome_probability(
            omega=omega,
            theta=scenario.theta,
            extrinsic_x=scenario.extrinsic_x,
            probability_gain=scenario.probability_gain,
        )

        feedback.append(
            {
                "iteration": step,
                "psi": float(psi),
                "omega": float(omega),
                "probability": float(p_next),
            }
        )

        if abs(p_next - p_estimate) <= scenario.feedback_tolerance:
            p_estimate = p_next
            break
        p_estimate = p_next

    psi_final = perceived_consequence_reality(
        probability=p_estimate,
        rho=scenario.rho,
        iota=scenario.iota,
        psi_gain=scenario.psi_gain,
        psi_midpoint=scenario.psi_midpoint,
    )

    trajectory = _simulate_trajectory(
        scenario,
        psi=psi_final,
        stochastic=(mode == "stochastic"),
        rng=rng,
    )

    trajectory["theta"] = scenario.theta
    trajectory["extrinsic_x"] = scenario.extrinsic_x
    trajectory["probability_gain"] = scenario.probability_gain

    return _simulation_from_trajectory(mode=mode, runs=1, psi=psi_final, trajectory_data=trajectory, feedback=feedback)


def simulate_scenario(
    scenario: ModelScenario,
    mode: str = "deterministic",
    seed: int | None = None,
    runs: int = 1,
) -> dict[str, Any]:
    if runs == 1:
        return simulate_single_run(scenario=scenario, mode=mode, seed=seed)

    run_results: list[dict[str, Any]] = []
    for idx in range(runs):
        run_seed = None if seed is None else seed + idx
        run_results.append(simulate_single_run(scenario=scenario, mode=mode, seed=run_seed))

    omega_values = np.array([r["summary"]["omega"] for r in run_results], dtype=float)
    prob_values = np.array([r["summary"]["probability"] for r in run_results], dtype=float)

    first = run_results[0]
    output_stack = np.array(
        [[point["output"] for point in run["trajectory"]] for run in run_results],
        dtype=float,
    )
    mean_output = np.mean(output_stack, axis=0)

    times = np.array([point["time"] for point in first["trajectory"]], dtype=float)
    stress = np.array([point["stress"] for point in first["trajectory"]], dtype=float)
    focus = np.array([point["focus"] for point in first["trajectory"]], dtype=float)
    distraction = np.array([point["distraction"] for point in first["trajectory"]], dtype=float)
    gate = np.array([point["terminal_gate"] for point in first["trajectory"]], dtype=float)

    mean_peak_idx = int(np.argmax(mean_output))

    combined = {
        "summary": {
            "omega": float(np.mean(omega_values)),
            "probability": float(np.mean(prob_values)),
            "psi": float(first["summary"]["psi"]),
            "phi": float(first["summary"]["phi"]),
            "lambda_c": float(first["summary"]["lambda_c"]),
            "peak_output": float(mean_output[mean_peak_idx]),
            "peak_time": float(times[mean_peak_idx]),
            "mode": mode,
            "runs": runs,
        },
        "trajectory": [
            {
                "time": float(times[i]),
                "stress": float(stress[i]),
                "focus": float(focus[i]),
                "distraction": float(distraction[i]),
                "output": float(mean_output[i]),
                "terminal_gate": float(gate[i]),
            }
            for i in range(times.shape[0])
        ],
        "feedback": first["feedback"],
        "distribution": {
            "omega_mean": float(np.mean(omega_values)),
            "omega_std": float(np.std(omega_values)),
            "omega_min": float(np.min(omega_values)),
            "omega_max": float(np.max(omega_values)),
            "probability_mean": float(np.mean(prob_values)),
            "probability_std": float(np.std(prob_values)),
            "probability_min": float(np.min(prob_values)),
            "probability_max": float(np.max(prob_values)),
        },
    }
    return combined


def _metric_from_result(result: dict[str, Any], target: str) -> float:
    if target == "omega":
        return float(result["summary"]["omega"])
    return float(result["summary"]["probability"])


def _update_scenario_value(scenario: ModelScenario, parameter: str, value: float) -> ModelScenario:
    data = scenario.model_dump()
    if parameter == "N_d":
        data[parameter] = int(max(0, round(value)))
    elif parameter == "n_steps":
        data[parameter] = int(max(20, round(value)))
    elif parameter == "t_f":
        data[parameter] = max(scenario.t_start + 1e-4, float(value))
    else:
        data[parameter] = float(value)
    return ModelScenario.model_validate(data)


def compute_sensitivity(
    scenario: ModelScenario,
    parameters: list[str],
    relative_step: float,
    target: str,
) -> dict[str, Any]:
    base_result = simulate_scenario(scenario, mode="deterministic", runs=1)
    base_metric = _metric_from_result(base_result, target)

    items: list[dict[str, float | str]] = []

    for param in parameters:
        if not hasattr(scenario, param):
            raise ValueError(f"unknown parameter: {param}")

        base_value = getattr(scenario, param)
        if not isinstance(base_value, (int, float)) or isinstance(base_value, bool):
            raise ValueError(f"parameter '{param}' is not numeric")

        magnitude = max(abs(float(base_value)), 1.0)
        step = relative_step * magnitude

        plus_value = float(base_value) + step
        minus_value = float(base_value) - step

        if param in {"iota", "rho", "psi_midpoint"}:
            plus_value = min(1.0, plus_value)
            minus_value = max(0.0, minus_value)
        if param in {"alpha", "beta", "lambda0", "gamma", "delta", "X_p0", "A", "probability_gain", "psi_gain"}:
            minus_value = max(1e-5, minus_value)
        if param in {"D0", "eta", "sigma_task", "sigma0", "sigma1", "C", "R_s", "R_f"}:
            minus_value = max(0.0, minus_value)

        plus_scenario = _update_scenario_value(scenario, param, plus_value)
        minus_scenario = _update_scenario_value(scenario, param, minus_value)

        plus_result = simulate_scenario(plus_scenario, mode="deterministic", runs=1)
        minus_result = simulate_scenario(minus_scenario, mode="deterministic", runs=1)

        metric_plus = _metric_from_result(plus_result, target)
        metric_minus = _metric_from_result(minus_result, target)

        denom = max(plus_value - minus_value, EPS)
        gradient = (metric_plus - metric_minus) / denom
        normalized = gradient * (float(base_value) if abs(float(base_value)) > EPS else 1.0) / max(abs(base_metric), EPS)

        items.append(
            {
                "parameter": param,
                "base_value": float(base_value),
                "plus_value": float(plus_value),
                "minus_value": float(minus_value),
                "metric_plus": float(metric_plus),
                "metric_minus": float(metric_minus),
                "gradient": float(gradient),
                "normalized_impact": float(normalized),
            }
        )

    items.sort(key=lambda x: abs(float(x["normalized_impact"])), reverse=True)

    return {
        "target": target,
        "base_metric": float(base_metric),
        "items": items,
    }


def compare_interventions(
    baseline: ModelScenario,
    interventions: list[dict[str, Any]],
    mode: str,
    seed: int | None,
    runs: int,
) -> dict[str, Any]:
    baseline_result = simulate_scenario(baseline, mode=mode, seed=seed, runs=runs)
    base_summary = baseline_result["summary"]

    outputs: list[dict[str, Any]] = []

    for idx, intervention in enumerate(interventions):
        name = str(intervention["name"])
        scenario = intervention["scenario"]
        run_seed = None if seed is None else seed + idx + 1

        result = simulate_scenario(scenario, mode=mode, seed=run_seed, runs=runs)
        summary = result["summary"]

        outputs.append(
            {
                "name": name,
                "omega": float(summary["omega"]),
                "probability": float(summary["probability"]),
                "delta_omega": float(summary["omega"] - base_summary["omega"]),
                "delta_probability": float(summary["probability"] - base_summary["probability"]),
            }
        )

    return {
        "baseline": base_summary,
        "interventions": outputs,
    }
