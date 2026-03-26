from __future__ import annotations

from fastapi.testclient import TestClient

from performance_model.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_simulate_endpoint_returns_terminal_zero() -> None:
    response = client.post("/simulate", json={"scenario": {"n_steps": 80}})

    assert response.status_code == 200
    payload = response.json()
    assert payload["summary"]["mode"] == "deterministic"
    assert payload["trajectory"][-1]["output"] == 0.0


def test_calibrate_rejects_unsupported_fit_parameter() -> None:
    observations = [{"time": i / 10.0, "output": float(i)} for i in range(6)]
    response = client.post(
        "/calibrate",
        json={
            "scenario": {},
            "observations": observations,
            "fit_parameters": ["iota"],
        },
    )

    assert response.status_code == 400
    assert "unsupported fit parameter" in response.json()["detail"]


def test_sensitivity_endpoint_returns_ranked_items() -> None:
    response = client.post(
        "/sensitivity",
        json={
            "scenario": {"n_steps": 60},
            "parameters": ["alpha", "beta"],
            "target": "probability",
            "relative_step": 0.05,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    items = payload["items"]
    assert len(items) == 2
    assert abs(items[0]["normalized_impact"]) >= abs(items[1]["normalized_impact"])


def test_compare_interventions_endpoint() -> None:
    response = client.post(
        "/compare-interventions",
        json={
            "baseline": {"n_steps": 80},
            "interventions": [
                {"name": "higher-stimulation", "scenario": {"n_steps": 80, "sigma_task": 1.2}}
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "baseline" in payload
    assert len(payload["interventions"]) == 1
    assert payload["interventions"][0]["name"] == "higher-stimulation"
