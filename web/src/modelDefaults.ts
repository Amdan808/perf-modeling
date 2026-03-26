import type { ModelScenario } from './api/client'

export const DEFAULT_SCENARIO: ModelScenario = {
  t_start: 0,
  t_f: 1,
  n_steps: 240,
  A: 2.4,
  alpha: 2.8,
  beta: 0.15,
  lambda0: 0.6,
  gamma: 0.2,
  C: 4.2,
  iota: 0.8,
  R_s: 1,
  R_f: 1,
  rho: 0.6,
  delta: 0.05,
  X_p0: 8,
  sigma_task: 0.6,
  D0: 1,
  N_d: 3,
  eta: 0.3,
  distraction_impact: 0.25,
  sigma0: 0.1,
  sigma1: 0.03,
  theta: 40,
  extrinsic_x: 0,
  probability_gain: 6,
  psi_gain: 8,
  psi_midpoint: 0.5,
  feedback_iterations: 8,
  feedback_tolerance: 0.0001,
}

export const SCENARIO_PRESETS = {
  baseline: {
    label: 'Baseline',
    description: 'Current calibrated baseline defaults.',
    patch: {},
  },
  deadline_pressure: {
    label: 'Deadline pressure',
    description: 'Higher stakes and shorter horizon.',
    patch: {
      C: 6.2,
      t_f: 0.75,
      rho: 0.8,
    },
  },
  stimulation_lift: {
    label: 'Stimulation lift',
    description: 'Increase task stimulation to lower focus threshold.',
    patch: {
      sigma_task: 1.2,
      X_p0: 7.2,
      N_d: 2,
    },
  },
  anti_noise_focus: {
    label: 'Anti-noise focus',
    description: 'Reduce distractions and noise variance.',
    patch: {
      D0: 0.7,
      N_d: 1,
      sigma0: 0.07,
      sigma1: 0.02,
    },
  },
} as const

export type ScenarioPresetKey = keyof typeof SCENARIO_PRESETS

export const PRESET_ORDER: ScenarioPresetKey[] = [
  'baseline',
  'deadline_pressure',
  'stimulation_lift',
  'anti_noise_focus',
]

const INTEGER_KEYS: Array<keyof ModelScenario> = [
  'n_steps',
  'N_d',
  'feedback_iterations',
]

const MIN_CONSTRAINTS: Partial<Record<keyof ModelScenario, number>> = {
  n_steps: 20,
  A: 0,
  alpha: 0.000001,
  beta: 0.000001,
  lambda0: 0,
  gamma: 0,
  C: 0,
  iota: 0,
  R_s: 0,
  R_f: 0,
  rho: 0,
  delta: 0.000001,
  X_p0: 0.000001,
  sigma_task: 0,
  D0: 0,
  N_d: 0,
  eta: 0,
  distraction_impact: 0,
  sigma0: 0,
  sigma1: 0,
  probability_gain: 0.000001,
  psi_gain: 0.000001,
  psi_midpoint: 0,
  feedback_iterations: 1,
  feedback_tolerance: 0.000001,
}

const MAX_CONSTRAINTS: Partial<Record<keyof ModelScenario, number>> = {
  n_steps: 4000,
  iota: 1,
  rho: 1,
  psi_midpoint: 1,
  feedback_iterations: 50,
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {}
  }
  return value as Record<string, unknown>
}

export function sanitizeScenario(value: unknown): ModelScenario {
  const incoming = toRecord(value)
  const next: ModelScenario = { ...DEFAULT_SCENARIO }

  for (const key of Object.keys(next) as Array<keyof ModelScenario>) {
    if (!(key in incoming)) {
      continue
    }

    const numeric = Number(incoming[key as string])
    if (!Number.isFinite(numeric)) {
      continue
    }

    next[key] = numeric as ModelScenario[typeof key]
  }

  for (const [key, minValue] of Object.entries(MIN_CONSTRAINTS) as Array<
    [keyof ModelScenario, number]
  >) {
    next[key] = Math.max(next[key], minValue) as ModelScenario[typeof key]
  }

  for (const [key, maxValue] of Object.entries(MAX_CONSTRAINTS) as Array<
    [keyof ModelScenario, number]
  >) {
    next[key] = Math.min(next[key], maxValue) as ModelScenario[typeof key]
  }

  for (const key of INTEGER_KEYS) {
    next[key] = Math.round(next[key]) as ModelScenario[typeof key]
  }

  if (next.t_f <= next.t_start) {
    next.t_f = next.t_start + 0.001
  }

  return next
}

export function mergeScenario(
  base: ModelScenario,
  patch: Partial<ModelScenario>,
): ModelScenario {
  return sanitizeScenario({ ...base, ...patch })
}

export function applyPreset(key: ScenarioPresetKey): ModelScenario {
  return sanitizeScenario({ ...DEFAULT_SCENARIO, ...SCENARIO_PRESETS[key].patch })
}
