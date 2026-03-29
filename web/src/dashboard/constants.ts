import type { ScenarioFieldGroup, QuickSliderGroup } from './types'

export const FIELD_GROUPS: ScenarioFieldGroup[] = [
  {
    title: 'Core dynamics',
    fields: [
      { key: 'A', label: 'Baseline capability', step: 0.05, min: 0 },
      {
        key: 'alpha',
        label: 'Stress activation sensitivity',
        step: 0.05,
        min: 0.000001,
      },
      {
        key: 'beta',
        label: 'Stress overload sensitivity',
        step: 0.01,
        min: 0.000001,
      },
      { key: 'C', label: 'Consequence pressure', step: 0.1, min: 0 },
      { key: 't_f', label: 'Deadline time', step: 0.01 },
      { key: 'delta', label: 'Deadline safety buffer', step: 0.01, min: 0.000001 },
      { key: 'n_steps', label: 'Timeline resolution', step: 1, min: 20, max: 4000 },
    ],
  },
  {
    title: 'Fatigue and noise',
    fields: [
      { key: 'lambda0', label: 'Base fatigue rate', step: 0.05, min: 0 },
      { key: 'gamma', label: 'Fatigue suppression strength', step: 0.05, min: 0 },
      { key: 'sigma0', label: 'Base variability', step: 0.01, min: 0 },
      { key: 'sigma1', label: 'Stress-linked variability', step: 0.01, min: 0 },
    ],
  },
  {
    title: 'Focus and distraction',
    fields: [
      { key: 'X_p0', label: 'Focus threshold baseline', step: 0.1, min: 0.000001 },
      { key: 'sigma_task', label: 'Task stimulation level', step: 0.05, min: 0 },
      { key: 'D0', label: 'Baseline distraction load', step: 0.05, min: 0 },
      { key: 'N_d', label: 'Active distraction count', step: 1, min: 0 },
      { key: 'eta', label: 'Distraction sensitivity', step: 0.05, min: 0 },
      {
        key: 'distraction_impact',
        label: 'Distraction impact strength',
        step: 0.05,
        min: 0,
      },
    ],
  },
  {
    title: 'Feedback and outcome',
    fields: [
      { key: 'iota', label: 'Identity alignment', step: 0.05, min: 0, max: 1 },
      { key: 'rho', label: 'Irreversibility level', step: 0.05, min: 0, max: 1 },
      { key: 'R_s', label: 'Success reward value', step: 0.1, min: 0 },
      { key: 'R_f', label: 'Failure consequence value', step: 0.1, min: 0 },
      { key: 'theta', label: 'Success threshold', step: 0.5 },
      { key: 'extrinsic_x', label: 'External factors score', step: 0.05 },
      {
        key: 'probability_gain',
        label: 'Probability curve steepness',
        step: 0.1,
        min: 0.000001,
      },
      {
        key: 'psi_gain',
        label: 'Consequence realism sensitivity',
        step: 0.1,
        min: 0.000001,
      },
      {
        key: 'psi_midpoint',
        label: 'Consequence realism midpoint',
        step: 0.05,
        min: 0,
        max: 1,
      },
      {
        key: 'feedback_iterations',
        label: 'Feedback update rounds',
        step: 1,
        min: 1,
        max: 50,
      },
      {
        key: 'feedback_tolerance',
        label: 'Feedback convergence tolerance',
        step: 0.0001,
        min: 0.000001,
      },
    ],
  },
]

export const QUICK_SLIDER_GROUPS: QuickSliderGroup[] = [
  {
    title: 'Stakes and potential',
    sliders: [
      { key: 'C', label: 'Consequence pressure', min: 0, max: 12, step: 0.1 },
      { key: 'iota', label: 'Identity alignment', min: 0, max: 1, step: 0.01 },
      { key: 'rho', label: 'Irreversibility level', min: 0, max: 1, step: 0.01 },
      { key: 'R_s', label: 'Success reward value', min: 0, max: 5, step: 0.1 },
      { key: 'R_f', label: 'Failure consequence value', min: 0, max: 5, step: 0.1 },
      { key: 'theta', label: 'Success threshold', min: 1, max: 120, step: 1 },
    ],
  },
  {
    title: 'Stress response',
    sliders: [
      { key: 'alpha', label: 'Stress activation sensitivity', min: 0.1, max: 6, step: 0.05 },
      { key: 'beta', label: 'Stress overload sensitivity', min: 0.01, max: 2, step: 0.01 },
      { key: 'A', label: 'Baseline capability', min: 0.1, max: 6, step: 0.05 },
      { key: 'lambda0', label: 'Base fatigue rate', min: 0, max: 3, step: 0.01 },
      { key: 'gamma', label: 'Fatigue suppression strength', min: 0, max: 2, step: 0.01 },
      { key: 't_f', label: 'Deadline time', min: 0.2, max: 2, step: 0.01 },
    ],
  },
  {
    title: 'Focus and distraction',
    sliders: [
      { key: 'sigma_task', label: 'Task stimulation level', min: 0, max: 3, step: 0.05 },
      { key: 'X_p0', label: 'Focus threshold baseline', min: 0.1, max: 20, step: 0.1 },
      { key: 'D0', label: 'Baseline distraction load', min: 0, max: 8, step: 0.05 },
      { key: 'N_d', label: 'Active distraction count', min: 0, max: 10, step: 1 },
      { key: 'eta', label: 'Distraction sensitivity', min: 0, max: 2, step: 0.01 },
      {
        key: 'distraction_impact',
        label: 'Distraction impact strength',
        min: 0,
        max: 2,
        step: 0.01,
      },
    ],
  },
]

export const DEFAULT_SENSITIVITY_PARAMS =
  'alpha,beta,lambda0,gamma,C,sigma_task,t_f,iota,rho'

export const EPSILON = 1e-9
export const STRESS_DISPLAY_CAP = 20
export const STRESS_MODEL_CAP = 40

export const CHART_COLORS = {
  output: '#4ca3ff',
  stress: '#ff5f68',
  focus: '#22c89a',
  omega: '#d7942f',
  axis: '#9ca3af',
  grid: 'rgba(255, 255, 255, 0.12)',
  tooltipBackground: '#121316',
  tooltipBorder: '#2f333b',
} as const
