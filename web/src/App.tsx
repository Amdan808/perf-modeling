import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'
import {
  ApiError,
  compareInterventions,
  fetchGovernance,
  fetchHealth,
  fetchSensitivity,
  fetchSimulation,
  type CompareResponse,
  type ModelScenario,
  type ParameterGovernanceResponse,
  type SensitivityResponse,
  type SensitivityTarget,
  type SimulationMode,
  type SimulationResponse,
} from './api/client'
import {
  DEFAULT_SCENARIO,
  PRESET_ORDER,
  SCENARIO_PRESETS,
  applyPreset,
  mergeScenario,
  sanitizeScenario,
  type ScenarioPresetKey,
} from './modelDefaults'

type ScenarioField = {
  key: keyof ModelScenario
  label: string
  step: number
  min?: number
  max?: number
}

type ScenarioFieldGroup = {
  title: string
  fields: ScenarioField[]
}

type Intervention = {
  id: string
  name: string
  scenario: ModelScenario
}

type ImportPayload = {
  scenario?: unknown
  mode?: unknown
  runs?: unknown
  seed?: unknown
  sensitivityParameters?: unknown
  sensitivityTarget?: unknown
  interventions?: unknown
}

const FIELD_GROUPS: ScenarioFieldGroup[] = [
  {
    title: 'Core dynamics',
    fields: [
      { key: 'A', label: 'A (capability)', step: 0.05, min: 0 },
      { key: 'alpha', label: 'alpha', step: 0.05, min: 0.000001 },
      { key: 'beta', label: 'beta', step: 0.01, min: 0.000001 },
      { key: 'C', label: 'C (stakes)', step: 0.1, min: 0 },
      { key: 't_f', label: 't_f (deadline)', step: 0.01 },
      { key: 'delta', label: 'delta', step: 0.01, min: 0.000001 },
      { key: 'n_steps', label: 'n_steps', step: 1, min: 20, max: 4000 },
    ],
  },
  {
    title: 'Fatigue and noise',
    fields: [
      { key: 'lambda0', label: 'lambda0', step: 0.05, min: 0 },
      { key: 'gamma', label: 'gamma', step: 0.05, min: 0 },
      { key: 'sigma0', label: 'sigma0', step: 0.01, min: 0 },
      { key: 'sigma1', label: 'sigma1', step: 0.01, min: 0 },
    ],
  },
  {
    title: 'Focus and distraction',
    fields: [
      { key: 'X_p0', label: 'X_p0', step: 0.1, min: 0.000001 },
      { key: 'sigma_task', label: 'sigma_task', step: 0.05, min: 0 },
      { key: 'D0', label: 'D0', step: 0.05, min: 0 },
      { key: 'N_d', label: 'N_d', step: 1, min: 0 },
      { key: 'eta', label: 'eta', step: 0.05, min: 0 },
      {
        key: 'distraction_impact',
        label: 'distraction_impact',
        step: 0.05,
        min: 0,
      },
    ],
  },
  {
    title: 'Feedback and outcome',
    fields: [
      { key: 'iota', label: 'iota', step: 0.05, min: 0, max: 1 },
      { key: 'rho', label: 'rho', step: 0.05, min: 0, max: 1 },
      { key: 'R_s', label: 'R_s', step: 0.1, min: 0 },
      { key: 'R_f', label: 'R_f', step: 0.1, min: 0 },
      { key: 'theta', label: 'theta', step: 0.5 },
      { key: 'extrinsic_x', label: 'extrinsic_x', step: 0.05 },
      {
        key: 'probability_gain',
        label: 'probability_gain',
        step: 0.1,
        min: 0.000001,
      },
      { key: 'psi_gain', label: 'psi_gain', step: 0.1, min: 0.000001 },
      {
        key: 'psi_midpoint',
        label: 'psi_midpoint',
        step: 0.05,
        min: 0,
        max: 1,
      },
      {
        key: 'feedback_iterations',
        label: 'feedback_iterations',
        step: 1,
        min: 1,
        max: 50,
      },
      {
        key: 'feedback_tolerance',
        label: 'feedback_tolerance',
        step: 0.0001,
        min: 0.000001,
      },
    ],
  },
]

const DEFAULT_SENSITIVITY_PARAMS =
  'alpha,beta,lambda0,gamma,C,sigma_task,t_f,iota,rho'

function interventionTemplate(
  scenario: ModelScenario,
  name: string,
  patch: Partial<ModelScenario>,
): Intervention {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    scenario: mergeScenario(scenario, patch),
  }
}

function defaultInterventions(base: ModelScenario): Intervention[] {
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

function parseSeed(seedText: string): number | null | undefined {
  if (seedText.trim() === '') {
    return null
  }

  const value = Number(seedText)
  if (!Number.isFinite(value)) {
    return undefined
  }

  return Math.round(value)
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 100 || Number.isInteger(value)) {
    return value.toFixed(2)
  }
  return value.toPrecision(4)
}

function NumberInput(props: {
  value: number
  step: number
  min?: number
  max?: number
  onChange: (value: number) => void
}) {
  const { value, step, min, max, onChange } = props

  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={(event) => {
        const next = Number(event.currentTarget.value)
        if (Number.isFinite(next)) {
          onChange(next)
        }
      }}
    />
  )
}

function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(
    import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000',
  )

  const [scenario, setScenario] = useState<ModelScenario>(DEFAULT_SCENARIO)
  const [presetKey, setPresetKey] = useState<ScenarioPresetKey>('baseline')

  const [mode, setMode] = useState<SimulationMode>('deterministic')
  const [runs, setRuns] = useState<number>(1)
  const [seedText, setSeedText] = useState<string>('')

  const [simulation, setSimulation] = useState<SimulationResponse | null>(null)
  const [sensitivity, setSensitivity] = useState<SensitivityResponse | null>(null)
  const [comparison, setComparison] = useState<CompareResponse | null>(null)
  const [governance, setGovernance] =
    useState<ParameterGovernanceResponse | null>(null)

  const [sensitivityParameters, setSensitivityParameters] = useState<string>(
    DEFAULT_SENSITIVITY_PARAMS,
  )
  const [sensitivityTarget, setSensitivityTarget] =
    useState<SensitivityTarget>('probability')

  const [interventions, setInterventions] = useState<Intervention[]>(
    defaultInterventions(DEFAULT_SCENARIO),
  )

  const [loading, setLoading] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const compareChartData = useMemo(() => {
    if (!comparison) {
      return []
    }

    return [
      {
        name: 'Baseline',
        probability: comparison.baseline.probability,
        omega: comparison.baseline.omega,
      },
      ...comparison.interventions.map((item) => ({
        name: item.name,
        probability: item.probability,
        omega: item.omega,
      })),
    ]
  }, [comparison])

  const runError = (error: unknown) => {
    if (error instanceof ApiError) {
      setErrorMessage(`API ${error.status}: ${error.detail}`)
      return
    }

    if (error instanceof Error) {
      setErrorMessage(error.message)
      return
    }

    setErrorMessage('Unknown error while executing request.')
  }

  const updateScenarioField = (key: keyof ModelScenario, value: number) => {
    setScenario((previous) =>
      mergeScenario(previous, { [key]: value } as Partial<ModelScenario>),
    )
  }

  const updateInterventionField = (
    interventionId: string,
    key: keyof ModelScenario,
    value: number,
  ) => {
    setInterventions((previous) =>
      previous.map((item) => {
        if (item.id !== interventionId) {
          return item
        }
        return {
          ...item,
          scenario: mergeScenario(item.scenario, {
            [key]: value,
          } as Partial<ModelScenario>),
        }
      }),
    )
  }

  const applySelectedPreset = (nextPreset: ScenarioPresetKey) => {
    const nextScenario = applyPreset(nextPreset)
    setPresetKey(nextPreset)
    setScenario(nextScenario)
    setInterventions(defaultInterventions(nextScenario))
    setStatusMessage(`Applied preset: ${SCENARIO_PRESETS[nextPreset].label}`)
  }

  const refreshBackendStatus = async () => {
    setLoading('status')
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const [health, governanceResponse] = await Promise.all([
        fetchHealth(apiBaseUrl),
        fetchGovernance(apiBaseUrl),
      ])

      setGovernance(governanceResponse)
      setStatusMessage(
        `Backend status: ${health.status}. Governance loaded (${governanceResponse.fitted_parameters.length} fitted params).`,
      )
    } catch (error) {
      runError(error)
    } finally {
      setLoading(null)
    }
  }

  const runSimulation = async () => {
    const seed = parseSeed(seedText)
    if (seed === undefined) {
      setErrorMessage('Seed must be an integer or empty.')
      return
    }

    setLoading('simulate')
    setErrorMessage(null)

    try {
      const response = await fetchSimulation(apiBaseUrl, {
        scenario,
        mode,
        runs,
        seed,
      })
      setSimulation(response)
      setStatusMessage('Simulation completed.')
    } catch (error) {
      runError(error)
    } finally {
      setLoading(null)
    }
  }

  const runSensitivity = async () => {
    const parameters = sensitivityParameters
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean)

    if (parameters.length === 0) {
      setErrorMessage('Provide at least one sensitivity parameter.')
      return
    }

    setLoading('sensitivity')
    setErrorMessage(null)

    try {
      const response = await fetchSensitivity(apiBaseUrl, {
        scenario,
        parameters,
        relative_step: 0.05,
        target: sensitivityTarget,
      })
      setSensitivity(response)
      setStatusMessage('Sensitivity analysis completed.')
    } catch (error) {
      runError(error)
    } finally {
      setLoading(null)
    }
  }

  const runComparison = async () => {
    const seed = parseSeed(seedText)
    if (seed === undefined) {
      setErrorMessage('Seed must be an integer or empty.')
      return
    }

    if (interventions.length === 0) {
      setErrorMessage('Add at least one intervention before comparison.')
      return
    }

    setLoading('compare')
    setErrorMessage(null)

    try {
      const response = await compareInterventions(apiBaseUrl, {
        baseline: scenario,
        interventions: interventions.map((item) => ({
          name: item.name,
          scenario: item.scenario,
        })),
        mode,
        runs,
        seed,
      })
      setComparison(response)
      setStatusMessage('Intervention comparison completed.')
    } catch (error) {
      runError(error)
    } finally {
      setLoading(null)
    }
  }

  const addIntervention = () => {
    const index = interventions.length + 1
    setInterventions((previous) => [
      ...previous,
      interventionTemplate(scenario, `Intervention ${index}`, {
        C: scenario.C,
        t_f: scenario.t_f,
        sigma_task: scenario.sigma_task,
      }),
    ])
  }

  const removeIntervention = (id: string) => {
    setInterventions((previous) => previous.filter((item) => item.id !== id))
  }

  const exportScenario = () => {
    const payload = {
      version: 1,
      scenario,
      mode,
      runs,
      seed: parseSeed(seedText),
      sensitivityParameters,
      sensitivityTarget,
      interventions,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'performance-model-scenario.json'
    anchor.click()
    URL.revokeObjectURL(url)

    setImportMessage('Scenario exported to JSON.')
  }

  const importScenario = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setImportMessage(null)
    setErrorMessage(null)

    try {
      const content = await file.text()
      const parsed = JSON.parse(content) as ImportPayload

      if (parsed.scenario !== undefined) {
        const nextScenario = sanitizeScenario(parsed.scenario)
        setScenario(nextScenario)
        setPresetKey('baseline')
      }

      if (parsed.mode === 'deterministic' || parsed.mode === 'stochastic') {
        setMode(parsed.mode)
      }

      if (parsed.runs !== undefined) {
        const nextRuns = Number(parsed.runs)
        if (Number.isFinite(nextRuns)) {
          setRuns(Math.max(1, Math.round(nextRuns)))
        }
      }

      if (parsed.seed === null) {
        setSeedText('')
      } else if (parsed.seed !== undefined) {
        const seed = Number(parsed.seed)
        if (Number.isFinite(seed)) {
          setSeedText(String(Math.round(seed)))
        }
      }

      if (typeof parsed.sensitivityParameters === 'string') {
        setSensitivityParameters(parsed.sensitivityParameters)
      }

      if (
        parsed.sensitivityTarget === 'omega' ||
        parsed.sensitivityTarget === 'probability'
      ) {
        setSensitivityTarget(parsed.sensitivityTarget)
      }

      if (Array.isArray(parsed.interventions)) {
        const nextInterventions = parsed.interventions
          .map((item): Intervention | null => {
            if (!item || typeof item !== 'object') {
              return null
            }

            const record = item as Record<string, unknown>
            const name =
              typeof record.name === 'string' && record.name.trim() !== ''
                ? record.name
                : `Intervention ${Math.random().toString(16).slice(2, 6)}`

            return {
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              name,
              scenario: sanitizeScenario(record.scenario),
            }
          })
          .filter((item): item is Intervention => item !== null)

        if (nextInterventions.length > 0) {
          setInterventions(nextInterventions)
        }
      }

      setImportMessage('Scenario import complete.')
    } catch (error) {
      runError(error)
    } finally {
      event.target.value = ''
    }
  }

  const resetScenario = () => {
    setScenario(DEFAULT_SCENARIO)
    setInterventions(defaultInterventions(DEFAULT_SCENARIO))
    setPresetKey('baseline')
    setStatusMessage('Scenario reset to baseline defaults.')
  }

  return (
    <div className="app-shell">
      <header className="panel">
        <h1>Performance Under Pressure Dashboard</h1>
        <p className="subtitle">
          Phase 2 UI for simulation, sensitivity ranking, and baseline vs
          intervention comparison.
        </p>

        <div className="toolbar-row">
          <label className="field-inline field-inline-wide">
            <span>API base URL</span>
            <input
              type="text"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.currentTarget.value)}
            />
          </label>

          <button
            type="button"
            onClick={refreshBackendStatus}
            disabled={loading === 'status'}
          >
            {loading === 'status' ? 'Checking…' : 'Check backend'}
          </button>

          <button type="button" onClick={exportScenario}>
            Export JSON
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="secondary"
          >
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden-input"
            onChange={importScenario}
          />
        </div>

        {statusMessage ? <p className="status ok">{statusMessage}</p> : null}
        {importMessage ? <p className="status ok">{importMessage}</p> : null}
        {errorMessage ? <p className="status error">{errorMessage}</p> : null}

        {governance ? (
          <div className="governance-box">
            <h2>Parameter governance</h2>
            <p>{governance.notes}</p>
            <p>
              <strong>Fitted:</strong> {governance.fitted_parameters.join(', ')}
            </p>
            <p>
              <strong>Scenario inputs:</strong>{' '}
              {governance.scenario_inputs.slice(0, 10).join(', ')}
              {governance.scenario_inputs.length > 10 ? ', …' : ''}
            </p>
          </div>
        ) : null}
      </header>

      <section className="panel">
        <div className="section-header">
          <h2>Scenario controls</h2>
          <p>Adjust model parameters and run API-driven analysis.</p>
        </div>

        <div className="toolbar-row">
          <label className="field-inline">
            <span>Preset</span>
            <select
              value={presetKey}
              onChange={(event) =>
                applySelectedPreset(event.currentTarget.value as ScenarioPresetKey)
              }
            >
              {PRESET_ORDER.map((key) => (
                <option key={key} value={key}>
                  {SCENARIO_PRESETS[key].label}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="secondary" onClick={resetScenario}>
            Reset scenario
          </button>
        </div>

        <p className="preset-description">
          {SCENARIO_PRESETS[presetKey].description}
        </p>

        <div className="field-groups">
          {FIELD_GROUPS.map((group) => (
            <fieldset key={group.title} className="field-group">
              <legend>{group.title}</legend>
              <div className="field-grid">
                {group.fields.map((field) => (
                  <label className="field-cell" key={String(field.key)}>
                    <span>{field.label}</span>
                    <NumberInput
                      value={scenario[field.key]}
                      step={field.step}
                      min={field.min}
                      max={field.max}
                      onChange={(value) => updateScenarioField(field.key, value)}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="toolbar-row">
          <label className="field-inline">
            <span>Mode</span>
            <select
              value={mode}
              onChange={(event) =>
                setMode(event.currentTarget.value as SimulationMode)
              }
            >
              <option value="deterministic">Deterministic</option>
              <option value="stochastic">Stochastic</option>
            </select>
          </label>

          <label className="field-inline">
            <span>Runs</span>
            <NumberInput
              value={runs}
              step={1}
              min={1}
              onChange={(value) => setRuns(Math.max(1, Math.round(value)))}
            />
          </label>

          <label className="field-inline">
            <span>Seed (optional)</span>
            <input
              type="text"
              value={seedText}
              onChange={(event) => setSeedText(event.currentTarget.value)}
              placeholder="e.g. 42"
            />
          </label>

          <button
            type="button"
            onClick={runSimulation}
            disabled={loading === 'simulate'}
          >
            {loading === 'simulate' ? 'Simulating…' : 'Run simulation'}
          </button>
        </div>
      </section>

      {simulation ? (
        <section className="panel">
          <div className="section-header">
            <h2>Simulation output</h2>
            <p>Trajectory and summary metrics from `/simulate`.</p>
          </div>

          <div className="metric-grid">
            <div className="metric-card">
              <span>Omega</span>
              <strong>{formatNumber(simulation.summary.omega)}</strong>
            </div>
            <div className="metric-card">
              <span>Probability</span>
              <strong>{formatNumber(simulation.summary.probability)}</strong>
            </div>
            <div className="metric-card">
              <span>Psi</span>
              <strong>{formatNumber(simulation.summary.psi)}</strong>
            </div>
            <div className="metric-card">
              <span>Peak output</span>
              <strong>{formatNumber(simulation.summary.peak_output)}</strong>
            </div>
          </div>

          <div className="chart-grid">
            <article className="chart-card">
              <h3>Output trajectory</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={simulation.trajectory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="output"
                    stroke="#2563eb"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="terminal_gate"
                    stroke="#64748b"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </article>

            <article className="chart-card">
              <h3>Stress and focus</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={simulation.trajectory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 1]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="stress"
                    stroke="#7c3aed"
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="focus"
                    stroke="#16a34a"
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="distraction"
                    stroke="#ea580c"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </article>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-header">
          <h2>Sensitivity analysis</h2>
          <p>
            Ranked local impacts from `/sensitivity` to identify dominant vs weak
            sliders.
          </p>
        </div>

        <div className="toolbar-row">
          <label className="field-inline field-inline-wide">
            <span>Parameters (comma-separated)</span>
            <input
              type="text"
              value={sensitivityParameters}
              onChange={(event) =>
                setSensitivityParameters(event.currentTarget.value)
              }
            />
          </label>

          <label className="field-inline">
            <span>Target</span>
            <select
              value={sensitivityTarget}
              onChange={(event) =>
                setSensitivityTarget(event.currentTarget.value as SensitivityTarget)
              }
            >
              <option value="probability">probability</option>
              <option value="omega">omega</option>
            </select>
          </label>

          <button
            type="button"
            onClick={runSensitivity}
            disabled={loading === 'sensitivity'}
          >
            {loading === 'sensitivity'
              ? 'Analyzing…'
              : 'Run sensitivity analysis'}
          </button>
        </div>

        {sensitivity ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Base</th>
                  <th>Metric (+)</th>
                  <th>Metric (-)</th>
                  <th>Normalized impact</th>
                </tr>
              </thead>
              <tbody>
                {sensitivity.items.map((item) => (
                  <tr key={item.parameter}>
                    <td>{item.parameter}</td>
                    <td>{formatNumber(item.base_value)}</td>
                    <td>{formatNumber(item.metric_plus)}</td>
                    <td>{formatNumber(item.metric_minus)}</td>
                    <td>{formatNumber(item.normalized_impact)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Intervention comparison</h2>
          <p>
            Configure intervention scenarios and compare them with baseline using
            `/compare-interventions`.
          </p>
        </div>

        <div className="toolbar-row">
          <button type="button" className="secondary" onClick={addIntervention}>
            Add intervention
          </button>
          <button
            type="button"
            onClick={runComparison}
            disabled={loading === 'compare'}
          >
            {loading === 'compare'
              ? 'Comparing…'
              : 'Run baseline vs intervention comparison'}
          </button>
        </div>

        <div className="intervention-grid">
          {interventions.map((item) => (
            <article className="intervention-card" key={item.id}>
              <div className="intervention-header">
                <input
                  type="text"
                  value={item.name}
                  onChange={(event) =>
                    setInterventions((previous) =>
                      previous.map((current) =>
                        current.id === item.id
                          ? { ...current, name: event.currentTarget.value }
                          : current,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="danger"
                  onClick={() => removeIntervention(item.id)}
                >
                  Remove
                </button>
              </div>

              <div className="field-grid field-grid-compact">
                <label className="field-cell">
                  <span>C</span>
                  <NumberInput
                    value={item.scenario.C}
                    step={0.1}
                    min={0}
                    onChange={(value) =>
                      updateInterventionField(item.id, 'C', value)
                    }
                  />
                </label>
                <label className="field-cell">
                  <span>t_f</span>
                  <NumberInput
                    value={item.scenario.t_f}
                    step={0.01}
                    onChange={(value) =>
                      updateInterventionField(item.id, 't_f', value)
                    }
                  />
                </label>
                <label className="field-cell">
                  <span>sigma_task</span>
                  <NumberInput
                    value={item.scenario.sigma_task}
                    step={0.05}
                    min={0}
                    onChange={(value) =>
                      updateInterventionField(item.id, 'sigma_task', value)
                    }
                  />
                </label>
                <label className="field-cell">
                  <span>iota</span>
                  <NumberInput
                    value={item.scenario.iota}
                    step={0.05}
                    min={0}
                    max={1}
                    onChange={(value) =>
                      updateInterventionField(item.id, 'iota', value)
                    }
                  />
                </label>
                <label className="field-cell">
                  <span>rho</span>
                  <NumberInput
                    value={item.scenario.rho}
                    step={0.05}
                    min={0}
                    max={1}
                    onChange={(value) =>
                      updateInterventionField(item.id, 'rho', value)
                    }
                  />
                </label>
              </div>
            </article>
          ))}
        </div>

        {comparison ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th>Omega</th>
                    <th>Probability</th>
                    <th>Δ Omega</th>
                    <th>Δ Probability</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Baseline</td>
                    <td>{formatNumber(comparison.baseline.omega)}</td>
                    <td>{formatNumber(comparison.baseline.probability)}</td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                  {comparison.interventions.map((item) => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td>{formatNumber(item.omega)}</td>
                      <td>{formatNumber(item.probability)}</td>
                      <td>{formatNumber(item.delta_omega)}</td>
                      <td>{formatNumber(item.delta_probability)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <article className="chart-card">
              <h3>Probability comparison</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={compareChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 1]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="probability" fill="#1d4ed8" />
                </BarChart>
              </ResponsiveContainer>
            </article>
          </>
        ) : null}
      </section>
    </div>
  )
}

export default App
