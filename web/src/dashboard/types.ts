import type { ModelScenario } from '../api/client'

export type ScenarioField = {
  key: keyof ModelScenario
  label: string
  step: number
  min?: number
  max?: number
}

export type ScenarioFieldGroup = {
  title: string
  fields: ScenarioField[]
}

export type Intervention = {
  id: string
  name: string
  scenario: ModelScenario
}

export type QuickSlider = {
  key: keyof ModelScenario
  label: string
  min: number
  max: number
  step: number
}

export type QuickSliderGroup = {
  title: string
  sliders: QuickSlider[]
}

export type SecondaryTab = 'analysis' | 'interventions'

export type ImportPayload = {
  scenario?: unknown
  mode?: unknown
  runs?: unknown
  seed?: unknown
  sensitivityParameters?: unknown
  sensitivityTarget?: unknown
  interventions?: unknown
}

export type LiveTrajectoryPoint = {
  time: number
  time_n: number
  stress: number
  output: number
  focus: number
  cumulative_output: number
}

export type LiveTelemetry = {
  phi: number
  lambdaC: number
  xp: number
  dMax: number
  sStar: number
  peakOutput: number
  peakTime: number
  omegaFinal: number
  focusFinal: number
  psi: number
  probability: number
}
