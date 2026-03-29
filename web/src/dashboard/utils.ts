import type { ModelScenario } from '../api/client'
import type { Intervention } from './types'
import { mergeScenario } from '../modelDefaults'

export function createStableId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function interventionTemplate(
  scenario: ModelScenario,
  name: string,
  patch: Partial<ModelScenario>,
): Intervention {
  return {
    id: createStableId(),
    name,
    scenario: mergeScenario(scenario, patch),
  }
}

export function defaultInterventions(base: ModelScenario): Intervention[] {
  return [
    interventionTemplate(base, 'Public commitment', {
      C: base.C * 1.25,
      iota: Math.min(1, base.iota + 0.05),
    }),
    interventionTemplate(base, 'Stimulation boost', {
      sigma_task: base.sigma_task + 0.4,
      N_d: Math.max(0, base.N_d - 1),
    }),
    interventionTemplate(base, 'Sub-deadline compression', {
      t_f: Math.max(base.t_start + 0.2, base.t_f * 0.75),
      delta: Math.max(0.01, base.delta * 0.8),
    }),
  ]
}

export function createIntervention(
  scenario: ModelScenario,
  name: string,
  patch: Partial<ModelScenario>,
): Intervention {
  return interventionTemplate(scenario, name, patch)
}

export function parseSeed(seedText: string): number | null | undefined {
  if (seedText.trim() === '') {
    return null
  }

  const value = Number(seedText)
  if (!Number.isFinite(value)) {
    return undefined
  }

  return Math.round(value)
}

export function clampRuns(value: number): number {
  return Math.min(500, Math.max(1, Math.round(value)))
}

export function formatNumber(value: number): string {
  if (Math.abs(value) >= 100 || Number.isInteger(value)) {
    return value.toFixed(2)
  }
  return value.toPrecision(4)
}

export function formatSliderValue(value: number, step: number): string {
  if (step >= 1) {
    return String(Math.round(value))
  }
  if (step >= 0.1) {
    return value.toFixed(1)
  }
  if (step >= 0.01) {
    return value.toFixed(2)
  }
  return value.toFixed(3)
}

export function normalizeSliderValue(value: number, step: number): number {
  if (step >= 1) {
    return Math.round(value)
  }
  return value
}
