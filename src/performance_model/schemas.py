"""Pydantic schemas for API requests and responses."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ModelScenario(BaseModel):
    t_start: float = Field(default=0.0)
    t_f: float = Field(default=1.0)
    n_steps: int = Field(default=240, ge=20, le=4000)

    A: float = Field(default=2.4, ge=0.0)
    alpha: float = Field(default=2.8, gt=0.0)
    beta: float = Field(default=0.15, gt=0.0)

    lambda0: float = Field(default=0.6, ge=0.0)
    gamma: float = Field(default=0.2, ge=0.0)
    C: float = Field(default=4.2, ge=0.0)

    iota: float = Field(default=0.8, ge=0.0, le=1.0)
    R_s: float = Field(default=1.0, ge=0.0)
    R_f: float = Field(default=1.0, ge=0.0)
    rho: float = Field(default=0.6, ge=0.0, le=1.0)

    delta: float = Field(default=0.05, gt=0.0)

    X_p0: float = Field(default=8.0, gt=0.0)
    sigma_task: float = Field(default=0.6, ge=0.0)
    D0: float = Field(default=1.0, ge=0.0)
    N_d: int = Field(default=3, ge=0)
    eta: float = Field(default=0.3, ge=0.0)
    distraction_impact: float = Field(default=0.25, ge=0.0)

    sigma0: float = Field(default=0.1, ge=0.0)
    sigma1: float = Field(default=0.03, ge=0.0)

    theta: float = Field(default=40.0)
    extrinsic_x: float = Field(default=0.0)
    probability_gain: float = Field(default=6.0, gt=0.0)

    psi_gain: float = Field(default=8.0, gt=0.0)
    psi_midpoint: float = Field(default=0.5, ge=0.0, le=1.0)

    feedback_iterations: int = Field(default=8, ge=1, le=50)
    feedback_tolerance: float = Field(default=1e-4, gt=0.0)

    @model_validator(mode="after")
    def validate_time_window(self) -> "ModelScenario":
        if self.t_f <= self.t_start:
            raise ValueError("t_f must be greater than t_start")
        return self


class SimulateRequest(BaseModel):
    scenario: ModelScenario = Field(default_factory=ModelScenario)
    mode: Literal["deterministic", "stochastic"] = "deterministic"
    seed: int | None = None
    runs: int = Field(default=1, ge=1, le=500)


class EvaluateRequest(BaseModel):
    omega: float
    theta: float = Field(default=40.0)
    extrinsic_x: float = Field(default=0.0)
    probability_gain: float = Field(default=6.0, gt=0.0)


class EvaluateResponse(BaseModel):
    probability: float = Field(ge=0.0, le=1.0)


class ObservationPoint(BaseModel):
    time: float
    output: float


class CalibrationRequest(BaseModel):
    scenario: ModelScenario = Field(default_factory=ModelScenario)
    observations: list[ObservationPoint] = Field(min_length=6)
    fit_parameters: list[str] | None = None
    initial_guess: dict[str, float] | None = None
    max_nfev: int = Field(default=300, ge=20, le=5000)

    @model_validator(mode="after")
    def validate_observation_times(self) -> "CalibrationRequest":
        if not self.observations:
            raise ValueError("observations cannot be empty")
        for obs in self.observations:
            if obs.time < self.scenario.t_start or obs.time > self.scenario.t_f:
                raise ValueError("observation times must fall within [t_start, t_f]")
        return self


class SensitivityRequest(BaseModel):
    scenario: ModelScenario = Field(default_factory=ModelScenario)
    parameters: list[str] | None = None
    relative_step: float = Field(default=0.05, gt=0.0, le=0.5)
    target: Literal["omega", "probability"] = "probability"


class InterventionCase(BaseModel):
    name: str = Field(min_length=1)
    scenario: ModelScenario


class CompareRequest(BaseModel):
    baseline: ModelScenario = Field(default_factory=ModelScenario)
    interventions: list[InterventionCase] = Field(min_length=1)
    mode: Literal["deterministic", "stochastic"] = "deterministic"
    seed: int | None = None
    runs: int = Field(default=1, ge=1, le=500)


class FeedbackStep(BaseModel):
    iteration: int
    psi: float = Field(ge=0.0, le=1.0)
    omega: float
    probability: float = Field(ge=0.0, le=1.0)


class DistributionStats(BaseModel):
    omega_mean: float
    omega_std: float
    omega_min: float
    omega_max: float
    probability_mean: float
    probability_std: float
    probability_min: float
    probability_max: float


class SimulationSummary(BaseModel):
    omega: float
    probability: float = Field(ge=0.0, le=1.0)
    psi: float = Field(ge=0.0, le=1.0)
    phi: float
    lambda_c: float
    peak_output: float
    peak_time: float
    mode: Literal["deterministic", "stochastic"]
    runs: int = Field(ge=1)


class TrajectoryPoint(BaseModel):
    time: float
    stress: float
    focus: float = Field(ge=0.0, le=1.0)
    distraction: float = Field(ge=0.0)
    output: float
    terminal_gate: float = Field(ge=0.0, le=1.0)


class SimulationResponse(BaseModel):
    summary: SimulationSummary
    trajectory: list[TrajectoryPoint]
    feedback: list[FeedbackStep]
    distribution: DistributionStats | None = None


class ParameterGovernanceResponse(BaseModel):
    scenario_inputs: list[str]
    fitted_parameters: list[str]
    notes: str


class CalibrationResponse(BaseModel):
    fit_parameters: list[str]
    fitted_parameters: dict[str, float]
    rmse: float
    mae: float
    success: bool
    message: str
    nfev: int
    parameter_governance: ParameterGovernanceResponse


class SensitivityItem(BaseModel):
    parameter: str
    base_value: float
    plus_value: float
    minus_value: float
    metric_plus: float
    metric_minus: float
    gradient: float
    normalized_impact: float


class SensitivityResponse(BaseModel):
    target: Literal["omega", "probability"]
    base_metric: float
    items: list[SensitivityItem]


class InterventionDelta(BaseModel):
    name: str
    omega: float
    probability: float = Field(ge=0.0, le=1.0)
    delta_omega: float
    delta_probability: float


class CompareResponse(BaseModel):
    baseline: SimulationSummary
    interventions: list[InterventionDelta]
