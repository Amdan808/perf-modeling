# Performance Under Pressure — Mathematical Model
*Compiled from conversation session, March 25 2026*

---

## Origin & Intent

The model formalizes a self-observed pattern: performance output is higher and more reliable under high-stakes, time-pressured conditions. The goal is to eventually derive practical interventions — ways to engineer the conditions that produce peak output earlier in a timeline, without waiting for natural deadline pressure.

---

## Architecture Overview

The system is two-layer:

- **Layer 1 — Output Engine (internal):** models instantaneous performance P(t) as a function of stress, potential, focus, and fatigue
- **Layer 2 — Outcome Evaluation (external):** evaluates whether accumulated output Ω is sufficient to produce a successful outcome, via probability p

These layers are connected by a feedback channel: assessed probability p feeds back into perceived consequence reality ψ, which modulates effective stakes C_eff.

---

## Layer 1 — Output Engine

### Core Equation

```
P(t_n) = A · Φ · S^α · exp(-βS) · exp(-λ(C)·t_n) · F(S) + ε(t_n)
```

**P(t_n) = 0** at t_n = t_f (deadline)

---

### Stress Factor

```
S = C_eff / (t_f - t_n + δ)
C_eff = C · ψ
```

S is the instantaneous stress load. It grows as the deadline approaches. δ is a small stability constant preventing division by zero at t_n = t_f. C_eff is effective stakes — the real consequence C scaled by ψ, the degree to which the consequence is psychologically perceived as real.

---

### Potential Factor Φ

```
Φ = ι · (R_s · R_f) · (1 + ρ)
```

| Symbol | Meaning |
|--------|---------|
| ι | Identity alignment — how central the outcome is to self-concept. Acts as a gate: ι = 0 collapses Φ entirely, reducing P(t) to pure noise. |
| R_s | Success reward magnitude |
| R_f | Failure punishment magnitude |
| ρ | Irreversibility ∈ [0,1] — how permanent failure is. Orthogonal to magnitude: a one-shot opportunity has ρ ≈ 1 even if R_f is moderate. |

R_s · R_f is a product, not a sum — captures multiplicative pressure of bidirectional stakes. Φ = 0 when ι = 0, regardless of how large R_s, R_f, or ρ are.

---

### Fatigue Suppression

```
λ(C) = λ₀ · exp(-γC)
```

Fatigue rate is not constant — it is suppressed by high genuine stakes. At low C, λ ≈ λ₀. As C → ∞, λ → 0. γ controls sensitivity of suppression to stakes.

**Key insight:** λ is also duration-dependent in ways the current form does not capture. In short high-pressure sprints (the primary observed regime), exp(-λt) ≈ 1 and fatigue contributes negligibly. The parameter is therefore not yet empirically calibrated and should be treated as open.

---

### Focus & Distraction

```
F(S)   = min(S / Xₚ(σ), 1)
Xₚ(σ) = Xₚ₀ / (1 + σ)
D(S)   = D_max · (1 - S/Xₚ)    for S < Xₚ
D(S)   = 0                       for S ≥ Xₚ
D_max  = D₀ · (1 + η·N_d)
```

| Symbol | Meaning |
|--------|---------|
| F(S) | Focus factor ∈ [0,1] — proportionally inverse to distraction |
| Xₚ | Stress threshold at which distractions vanish |
| σ | Task stimulation — reduces Xₚ, meaning engaging tasks reach full focus at lower stress |
| D_max | Maximum distraction capacity |
| D₀ | Baseline distraction level |
| N_d | Number of active distraction sources |
| η | Sensitivity to distraction count (entropy term) |

**Stimulation note:** σ does not add to focus directly — it lowers the threshold Xₚ needed to achieve full focus. A highly stimulating task (competitive game, deep creative flow) can sustain F = 1 at moderate stress, bypassing the need for external deadline pressure. This also explains the quarantine condition: external stress S_ext only breaks into an engaging activity's attentional bubble when S_ext ≥ Xₚ(σ).

---

### Noise Term

```
ε(t_n) ~ N(0, (σ₀ + σ₁·S)²)
```

Heteroscedastic variance — high stress widens the distribution. High-stakes situations don't just raise expected output; they increase variance. You either clutch or choke.

---

## Layer 2 — Outcome Evaluation (External)

```
Ω    = ∫[t_start to t_f] P(t) dt     [accumulated output]
p    = g(Ω, θ, X)                     [probability of success]
```

| Symbol | Meaning |
|--------|---------|
| Ω | Total accumulated output over preparation interval |
| θ | Success threshold — externally determined (exam standard, competition bar, etc.) |
| X | Extrinsic factors — luck, information asymmetry, evaluator variance, etc. |
| p | Probability of success, determined by whether Ω clears θ given X |

**Architectural boundary:** P(t) models output *generation*. p models outcome *evaluation*. They are separate. The equation can be running at maximum for a 3-day sprint and still produce low p if the required Ω to clear θ demanded months of accumulation. The engine did its job; the external bar was not clearable.

---

## Feedback Channel: p → ψ

```
p → ψ → C_eff
```

p does not enter P(t) directly. Its re-entry point is through ψ — the perceived reality of consequences. When a rational assessment of Ω vs θ reveals that no level of sprint performance can compensate for lost preparation time, the causal chain between effort and outcome is severed. This causes a Bayesian collapse of ψ, reducing C_eff, reducing S, and degrading P(t). Not demoralization as a soft state — a rational update.

The exact functional form of ψ = f(p, ρ, ι) is **open / not yet specified.**

---

## Full Variable Table

| Symbol | Meaning | Status |
|--------|---------|--------|
| P(t_n) | Instantaneous performance output | Core |
| t_n | Current time | Core |
| t_f | Deadline | Core |
| C | Objective consequence / stakes | Core |
| C_eff | Effective stakes = C · ψ | Core |
| ψ | Perceived consequence reality ∈ [0,1] | Partially specified |
| S | Stress factor | Core |
| δ | Stability constant near deadline | Core |
| A | Baseline capability | Core |
| α | Stress activation sensitivity | Calibrated (self-obs) |
| β | Stress overload sensitivity | Calibrated (self-obs) |
| Φ | Potential factor | Core |
| ι | Identity alignment ∈ [0,1] | Core |
| R_s | Success reward magnitude | Core |
| R_f | Failure punishment magnitude | Core |
| ρ | Irreversibility ∈ [0,1] | Core |
| λ₀ | Baseline fatigue rate | Open (untested) |
| γ | Fatigue suppression sensitivity to stakes | Open |
| λ(C) | Stakes-dependent fatigue rate | Core |
| F(S) | Focus factor ∈ [0,1] | Core |
| Xₚ | Stress threshold for full focus | Core |
| Xₚ₀ | Baseline focus threshold | Core |
| σ | Task stimulation | Core |
| D(S) | Distraction level | Core |
| D_max | Maximum distraction capacity | Core |
| D₀ | Baseline distraction | Core |
| N_d | Number of active distraction sources | Core |
| η | Distraction entropy sensitivity | Core |
| ε(t_n) | Noise term | Core |
| σ₀ | Baseline variance | Core |
| σ₁ | Stress-dependent variance coefficient | Core |
| Ω | Accumulated output = ∫P dt | Layer 2 |
| p | Probability of success | Layer 2 |
| θ | External success threshold | Layer 2 |
| X | Extrinsic factors | Layer 2 |

---

## Open Items

1. **ψ = f(p, ρ, ι)** — exact form not yet specified. How do irreversibility, identity alignment, and assessed probability combine into perceived consequence reality?
2. **g(Ω, θ, X)** — outcome function not yet specified. How does accumulated output map to probability of success given threshold and extrinsic noise?
3. **λ calibration** — fatigue parameters λ₀ and γ are theoretically sound but empirically untested. Only observable in genuinely prolonged high-output periods.
4. **D_max → F coupling** — D_max is currently computed but not yet integrated back into F(S) in the interactive model. Next implementation step.
5. **Interventions** — the original goal: using the equation to engineer earlier performance. Deferred until model is satisfactory. Key levers identified so far: C (raise perceived stakes via public commitment), t_f (artificial sub-deadlines), σ (increase task stimulation to lower Xₚ).

---

## Self-Calibrated Parameters (from observed data)

Based on the user's self-assessment screenshot (α=2.8, β=0.15, A=2.4, λ=0.60, C=4.2):

- **S* = α/β ≈ 18.67** — unusually high optimal stress threshold
- **α = 2.8** — steep activation ramp, ignites fast once stress builds
- **β = 0.15** — low overload sensitivity, hard to break under pressure
- **Shape:** near-hockey-stick curve — performance idles for ~70% of timeline, erupts in final stretch
- **λ note:** the high λ=0.60 reading is likely an artifact of normalization, not empirically validated over real durations

---

*End of compiled session. Continue in Claude Code.*
