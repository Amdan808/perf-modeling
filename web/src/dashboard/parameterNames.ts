import type { ModelScenario } from '../api/client'

export const PUBLIC_PARAMETER_LABELS: Record<keyof ModelScenario, string> = {
  t_start: 'Start time',
  t_f: 'Deadline time',
  n_steps: 'Timeline resolution',
  A: 'Baseline capability',
  alpha: 'Stress activation sensitivity',
  beta: 'Stress overload sensitivity',
  lambda0: 'Base fatigue rate',
  gamma: 'Fatigue suppression strength',
  C: 'Consequence pressure',
  iota: 'Identity alignment',
  R_s: 'Success reward value',
  R_f: 'Failure consequence value',
  rho: 'Irreversibility level',
  delta: 'Deadline safety buffer',
  X_p0: 'Focus threshold baseline',
  sigma_task: 'Task stimulation level',
  D0: 'Baseline distraction load',
  N_d: 'Active distraction count',
  eta: 'Distraction sensitivity',
  distraction_impact: 'Distraction impact strength',
  sigma0: 'Base variability',
  sigma1: 'Stress-linked variability',
  theta: 'Success threshold',
  extrinsic_x: 'External factors score',
  probability_gain: 'Probability curve steepness',
  psi_gain: 'Consequence realism sensitivity',
  psi_midpoint: 'Consequence realism midpoint',
  feedback_iterations: 'Feedback update rounds',
  feedback_tolerance: 'Feedback convergence tolerance',
}

export const PUBLIC_PARAMETER_DESCRIPTIONS: Record<keyof ModelScenario, string> = {
  t_start: 'Normalized time where simulation starts.',
  t_f: 'Normalized deadline time where output is forced to zero.',
  n_steps: 'Number of timeline points used for simulation and plotting.',
  A: 'Baseline ability multiplier before stress and focus effects.',
  alpha: 'How quickly performance activates as stress rises.',
  beta: 'How strongly high stress suppresses performance (overload).',
  lambda0: 'Base fatigue decay rate before stake suppression.',
  gamma: 'How much higher pressure suppresses fatigue decay.',
  C: 'Perceived consequence pressure driving stress intensity.',
  iota: 'How strongly the outcome aligns with identity and self-concept.',
  R_s: 'Perceived reward value if the outcome succeeds.',
  R_f: 'Perceived consequence value if the outcome fails.',
  rho: 'How irreversible the outcome feels, from 0 to 1.',
  delta: 'Small stability buffer near the deadline denominator.',
  X_p0: 'Baseline stress level required to reach full focus.',
  sigma_task: 'How stimulating the task is; higher values lower focus threshold.',
  D0: 'Baseline distraction load in low-stress conditions.',
  N_d: 'Count of active distraction sources affecting attention.',
  eta: 'Sensitivity of distraction growth to distraction count.',
  distraction_impact: 'How strongly distraction lowers effective focus.',
  sigma0: 'Baseline randomness in output variability.',
  sigma1: 'Additional variability added as stress increases.',
  theta: 'External performance threshold required for success.',
  extrinsic_x: 'External factors that shift success odds independent of output.',
  probability_gain: 'Steepness of the success-probability transition curve.',
  psi_gain: 'Sensitivity of consequence realism to estimated success probability.',
  psi_midpoint: 'Probability midpoint where consequence realism shifts most.',
  feedback_iterations: 'Maximum update rounds for probability-to-realism feedback.',
  feedback_tolerance: 'Convergence tolerance for stopping feedback updates early.',
}

const EXTRA_ALIASES: Array<[string, keyof ModelScenario]> = [
  ['stakes', 'C'],
  ['pressure', 'C'],
  ['deadline', 't_f'],
  ['start', 't_start'],
  ['activation', 'alpha'],
  ['overload', 'beta'],
  ['fatigue base', 'lambda0'],
  ['fatigue suppression', 'gamma'],
  ['task stimulation', 'sigma_task'],
  ['focus threshold', 'X_p0'],
  ['distraction count', 'N_d'],
  ['success reward', 'R_s'],
  ['failure cost', 'R_f'],
  ['irreversibility', 'rho'],
  ['identity', 'iota'],
  ['success threshold', 'theta'],
  ['external factors', 'extrinsic_x'],
  ['probability gain', 'probability_gain'],
  ['psi gain', 'psi_gain'],
  ['psi midpoint', 'psi_midpoint'],
]

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '')
}

const ALIAS_MAP: Record<string, keyof ModelScenario> = (() => {
  const aliases: Record<string, keyof ModelScenario> = {}
  const keys = Object.keys(PUBLIC_PARAMETER_LABELS) as Array<keyof ModelScenario>

  for (const key of keys) {
    aliases[normalizeToken(key)] = key
    aliases[normalizeToken(PUBLIC_PARAMETER_LABELS[key])] = key
  }

  for (const [alias, key] of EXTRA_ALIASES) {
    aliases[normalizeToken(alias)] = key
  }

  return aliases
})()

export function isScenarioParameterKey(value: string): value is keyof ModelScenario {
  return Object.prototype.hasOwnProperty.call(PUBLIC_PARAMETER_LABELS, value)
}

export function getPublicParameterLabel(key: keyof ModelScenario): string {
  return PUBLIC_PARAMETER_LABELS[key]
}

export function getPublicParameterDescription(key: keyof ModelScenario): string {
  return PUBLIC_PARAMETER_DESCRIPTIONS[key]
}

export function getPublicParameterDescriptionFromKey(parameter: string): string {
  if (!isScenarioParameterKey(parameter)) {
    return parameter
  }
  return getPublicParameterDescription(parameter)
}

export function getPublicParameterLabelWithKey(parameter: string): string {
  if (!isScenarioParameterKey(parameter)) {
    return parameter
  }
  return `${getPublicParameterLabel(parameter)} (${parameter})`
}

export function getPublicParameterTooltip(parameter: string): string {
  if (!isScenarioParameterKey(parameter)) {
    return parameter
  }
  return `${getPublicParameterLabel(parameter)} (${parameter}): ${getPublicParameterDescription(parameter)}`
}

export function resolveParameterToken(token: string): keyof ModelScenario | null {
  const trimmed = token.trim()
  if (!trimmed) {
    return null
  }
  if (isScenarioParameterKey(trimmed)) {
    return trimmed
  }
  const normalized = normalizeToken(trimmed)
  return ALIAS_MAP[normalized] ?? null
}

export function parsePublicParameterInput(input: string): {
  resolved: Array<keyof ModelScenario>
  unknown: string[]
} {
  const tokens = input
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)

  const resolved: Array<keyof ModelScenario> = []
  const resolvedSet = new Set<keyof ModelScenario>()
  const unknown: string[] = []

  for (const token of tokens) {
    const key = resolveParameterToken(token)
    if (!key) {
      unknown.push(token)
      continue
    }
    if (!resolvedSet.has(key)) {
      resolvedSet.add(key)
      resolved.push(key)
    }
  }

  return { resolved, unknown }
}
