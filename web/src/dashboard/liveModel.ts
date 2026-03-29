import type { ModelScenario } from '../api/client'
import { EPSILON, STRESS_DISPLAY_CAP } from './constants'
import type { LiveTelemetry, LiveTrajectoryPoint } from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function sigmoid(x: number): number {
  if (x >= 0) {
    return 1 / (1 + Math.exp(-x))
  }
  const expX = Math.exp(x)
  return expX / (1 + expX)
}

function outcomeProbability(scenario: ModelScenario, omega: number): number {
  const scale = Math.max(Math.abs(scenario.theta), 1)
  const z =
    scenario.probability_gain *
    (((omega - scenario.theta) / scale) + scenario.extrinsic_x)
  return clamp(sigmoid(z), 0, 1)
}

function perceivedConsequenceReality(
  scenario: ModelScenario,
  probability: number,
): number {
  const p = clamp(probability, 0, 1)
  const midpoint = clamp(scenario.psi_midpoint, 0, 1)
  const stakeAnchor = 0.25 + 0.75 * ((scenario.rho + scenario.iota) / 2)
  const response = sigmoid(scenario.psi_gain * (p - midpoint))
  return clamp(stakeAnchor * response, 0, 1)
}

function simulateDeterministicTrajectory(
  scenario: ModelScenario,
  psi: number,
): LiveTrajectoryPoint[] {
  const tStart = scenario.t_start
  const tF = Math.max(scenario.t_f, tStart + 0.001)
  const span = Math.max(tF - tStart, EPSILON)
  const points = Math.max(80, Math.min(900, Math.round(scenario.n_steps)))

  const phi = scenario.iota * scenario.R_s * scenario.R_f * (1 + scenario.rho)
  const lambdaC = scenario.lambda0 * Math.exp(-scenario.gamma * scenario.C)
  const xp = scenario.X_p0 / Math.max(1 + scenario.sigma_task, EPSILON)
  const dMax = scenario.D0 * (1 + scenario.eta * scenario.N_d)

  const series: LiveTrajectoryPoint[] = []

  let previousOutput = 0
  let previousTime = tStart
  let cumulative = 0

  for (let i = 0; i <= points; i += 1) {
    const t = tStart + (i / points) * span
    const timeN = (t - tStart) / span

    const remaining = Math.max(tF - t, 0)
    const stress = (scenario.C * psi) / (remaining + scenario.delta)

    const baseFocus = clamp(stress / Math.max(xp, EPSILON), 0, 1)
    const distraction =
      stress < xp ? Math.max(dMax * (1 - stress / Math.max(xp, EPSILON)), 0) : 0
    const focus = clamp(
      baseFocus * Math.exp(-scenario.distraction_impact * distraction),
      0,
      1,
    )

    const activation =
      Math.pow(Math.max(stress, 0), scenario.alpha) *
      Math.exp(-scenario.beta * stress)
    const fatigue = Math.exp(-lambdaC * (t - tStart))
    const ratio = clamp((tF - t) / span, 0, 1)
    const terminalGate = ratio * ratio * (3 - 2 * ratio)

    const outputRaw = scenario.A * phi * activation * fatigue * focus * terminalGate
    const output = Number.isFinite(outputRaw) ? Math.max(outputRaw, 0) : 0

    if (i > 0) {
      const dt = t - previousTime
      cumulative += ((output + previousOutput) / 2) * dt
    }

    series.push({
      time: t,
      time_n: timeN,
      stress: Math.min(stress, STRESS_DISPLAY_CAP),
      output,
      focus,
      cumulative_output: cumulative,
    })

    previousOutput = output
    previousTime = t
  }

  if (series.length > 0) {
    const last = series[series.length - 1]
    series[series.length - 1] = {
      ...last,
      output: 0,
    }
  }

  return series
}

export function computeLivePreview(scenario: ModelScenario): {
  trajectory: LiveTrajectoryPoint[]
  telemetry: LiveTelemetry | null
} {
  let probabilityEstimate = 0.5

  for (let step = 0; step < scenario.feedback_iterations; step += 1) {
    const psi = perceivedConsequenceReality(scenario, probabilityEstimate)
    const candidate = simulateDeterministicTrajectory(scenario, psi)
    const omega = candidate[candidate.length - 1]?.cumulative_output ?? 0
    const nextProbability = outcomeProbability(scenario, omega)

    if (Math.abs(nextProbability - probabilityEstimate) <= scenario.feedback_tolerance) {
      probabilityEstimate = nextProbability
      break
    }

    probabilityEstimate = nextProbability
  }

  const psiFinal = perceivedConsequenceReality(scenario, probabilityEstimate)
  const trajectory = simulateDeterministicTrajectory(scenario, psiFinal)

  if (trajectory.length === 0) {
    return {
      trajectory,
      telemetry: null,
    }
  }

  const omegaFinal = trajectory[trajectory.length - 1].cumulative_output
  const probability = outcomeProbability(scenario, omegaFinal)

  const phi = scenario.iota * scenario.R_s * scenario.R_f * (1 + scenario.rho)
  const lambdaC = scenario.lambda0 * Math.exp(-scenario.gamma * scenario.C)
  const xp = scenario.X_p0 / Math.max(1 + scenario.sigma_task, EPSILON)
  const dMax = scenario.D0 * (1 + scenario.eta * scenario.N_d)
  const sStar = scenario.alpha / Math.max(scenario.beta, EPSILON)

  const peakPoint = trajectory.reduce((best, point) =>
    point.output > best.output ? point : best,
  )

  return {
    trajectory,
    telemetry: {
      phi,
      lambdaC,
      xp,
      dMax,
      sStar,
      peakOutput: peakPoint.output,
      peakTime: peakPoint.time_n,
      omegaFinal,
      focusFinal: trajectory[trajectory.length - 1].focus,
      psi: psiFinal,
      probability,
    },
  }
}
