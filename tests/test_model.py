from __future__ import annotations

import numpy as np

from performance_model.model import (
    focus_factor,
    outcome_probability,
    perceived_consequence_reality,
    smooth_terminal_gate,
)
from performance_model.schemas import ModelScenario


def test_outcome_probability_is_bounded() -> None:
    low = outcome_probability(omega=-1000.0, theta=40.0, extrinsic_x=0.0, probability_gain=6.0)
    high = outcome_probability(omega=1000.0, theta=40.0, extrinsic_x=0.0, probability_gain=6.0)

    assert 0.0 <= low <= 1.0
    assert 0.0 <= high <= 1.0
    assert low < high


def test_perceived_reality_monotonic_in_probability() -> None:
    low_p = perceived_consequence_reality(0.1, rho=0.6, iota=0.8, psi_gain=8.0, psi_midpoint=0.5)
    high_p = perceived_consequence_reality(0.9, rho=0.6, iota=0.8, psi_gain=8.0, psi_midpoint=0.5)

    assert 0.0 <= low_p <= 1.0
    assert 0.0 <= high_p <= 1.0
    assert high_p > low_p


def test_smooth_terminal_gate_behaves() -> None:
    t_start = 0.0
    t_f = 1.0
    times = np.array([t_start, 0.5, t_f])

    gate = smooth_terminal_gate(times, t_start=t_start, t_f=t_f)

    assert np.isclose(gate[0], 1.0)
    assert gate[1] > 0.0
    assert np.isclose(gate[2], 0.0)


def test_distraction_coupling_lowers_focus_when_dmax_increases() -> None:
    base = ModelScenario(N_d=1, sigma_task=0.8)
    high_distraction = ModelScenario(N_d=8, sigma_task=0.8)

    stress = np.array([1.5])

    focus_base, distraction_base, _, _ = focus_factor(stress, base)
    focus_high, distraction_high, _, _ = focus_factor(stress, high_distraction)

    assert distraction_high[0] > distraction_base[0]
    assert focus_high[0] < focus_base[0]
