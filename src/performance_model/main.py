"""FastAPI app exposing simulation, calibration, and analysis endpoints."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException

from .calibration import calibrate
from .engine import compare_interventions, compute_sensitivity, simulate_scenario
from .governance import FITTED_PARAMETERS, governance_payload
from .model import outcome_probability
from .schemas import (
    CalibrationRequest,
    CalibrationResponse,
    CompareRequest,
    CompareResponse,
    EvaluateRequest,
    EvaluateResponse,
    ParameterGovernanceResponse,
    SensitivityRequest,
    SensitivityResponse,
    SimulateRequest,
    SimulationResponse,
)

app = FastAPI(
    title="Performance Under Pressure API",
    version="0.1.0",
    description="Executable model backend with feedback closure, calibration, and sensitivity analysis.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/parameter-governance", response_model=ParameterGovernanceResponse)
def parameter_governance() -> dict[str, object]:
    return governance_payload()


@app.post("/simulate", response_model=SimulationResponse)
def simulate(request: SimulateRequest) -> dict[str, object]:
    result = simulate_scenario(
        scenario=request.scenario,
        mode=request.mode,
        seed=request.seed,
        runs=request.runs,
    )
    return result


@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate(request: EvaluateRequest) -> EvaluateResponse:
    probability = outcome_probability(
        omega=request.omega,
        theta=request.theta,
        extrinsic_x=request.extrinsic_x,
        probability_gain=request.probability_gain,
    )
    return EvaluateResponse(probability=probability)


@app.post("/calibrate", response_model=CalibrationResponse)
def calibrate_endpoint(request: CalibrationRequest) -> dict[str, object]:
    try:
        return calibrate(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/sensitivity", response_model=SensitivityResponse)
def sensitivity_endpoint(request: SensitivityRequest) -> dict[str, object]:
    try:
        params = request.parameters or list(FITTED_PARAMETERS + ("C", "sigma_task", "t_f"))
        return compute_sensitivity(
            scenario=request.scenario,
            parameters=params,
            relative_step=request.relative_step,
            target=request.target,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/compare-interventions", response_model=CompareResponse)
def compare_endpoint(request: CompareRequest) -> dict[str, object]:
    interventions = [{"name": case.name, "scenario": case.scenario} for case in request.interventions]
    return compare_interventions(
        baseline=request.baseline,
        interventions=interventions,
        mode=request.mode,
        seed=request.seed,
        runs=request.runs,
    )
