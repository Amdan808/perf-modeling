import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  Area,
  AreaChart,
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
import PresentationView from './PresentationView'
import NumberInput from './components/NumberInput'
import InfoTooltip from './components/InfoTooltip'
import {
  CHART_COLORS,
  DEFAULT_SENSITIVITY_PARAMS,
  FIELD_GROUPS,
  QUICK_SLIDER_GROUPS,
} from './dashboard/constants'
import { computeLivePreview } from './dashboard/liveModel'
import type { ImportPayload, Intervention, SecondaryTab } from './dashboard/types'
import {
  getPublicParameterDescription,
  getPublicParameterDescriptionFromKey,
  getPublicParameterLabelWithKey,
  parsePublicParameterInput,
} from './dashboard/parameterNames'
import {
  clampRuns,
  createIntervention,
  createStableId,
  defaultInterventions,
  formatNumber,
  formatSliderValue,
  normalizeSliderValue,
  parseSeed,
} from './dashboard/utils'

function App() {
  const [viewMode, setViewMode] = useState<'dashboard' | 'presentation'>(
    'dashboard',
  )
  const [backendDrawerOpen, setBackendDrawerOpen] = useState(false)
  const [secondaryTab, setSecondaryTab] = useState<SecondaryTab>('analysis')
  const [advancedMode, setAdvancedMode] = useState(false)

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

  useEffect(() => {
    const storedMode = window.localStorage.getItem('dashboard-mode')
    if (storedMode === 'advanced') {
      setAdvancedMode(true)
    }

    const storedTab = window.localStorage.getItem('dashboard-secondary-tab')
    if (storedTab === 'interventions' || storedTab === 'analysis') {
      setSecondaryTab(storedTab)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      'dashboard-mode',
      advancedMode ? 'advanced' : 'simple',
    )
  }, [advancedMode])

  useEffect(() => {
    window.localStorage.setItem('dashboard-secondary-tab', secondaryTab)
  }, [secondaryTab])

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

  const livePreview = useMemo(() => computeLivePreview(scenario), [scenario])
  const liveEquationTrajectory = livePreview.trajectory
  const liveTelemetry = livePreview.telemetry

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
    const { resolved: parameters, unknown } =
      parsePublicParameterInput(sensitivityParameters)

    if (parameters.length === 0) {
      setErrorMessage(
        'Provide at least one valid parameter (public name or technical key).',
      )
      return
    }

    if (unknown.length > 0) {
      setErrorMessage(
        `Unknown sensitivity parameter(s): ${unknown.join(', ')}.`,
      )
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
      createIntervention(scenario, `Intervention ${index}`, {
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
          setRuns(clampRuns(nextRuns))
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
                : `Intervention ${createStableId().slice(-4)}`

            return {
              id: createStableId(),
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
      <section className="panel view-mode-panel">
        <div className="view-mode-row">
          <div>
            <h1>Performance Under Pressure</h1>
            <p className="subtitle">
              Switch between the interactive dashboard and a public-friendly
              presentation.
            </p>
          </div>

          <div className="header-actions">
            <div className="view-toggle">
              <button
                type="button"
                onClick={() => setViewMode('dashboard')}
                className={viewMode === 'dashboard' ? '' : 'secondary'}
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setViewMode('presentation')}
                className={viewMode === 'presentation' ? '' : 'secondary'}
              >
                Documentation
              </button>
            </div>

            <button
              type="button"
              className="secondary"
              onClick={() => setBackendDrawerOpen((previous) => !previous)}
              aria-expanded={backendDrawerOpen}
            >
              {backendDrawerOpen ? 'Hide backend ⚙' : 'Backend & data ⚙'}
            </button>
          </div>
        </div>

        {viewMode === 'dashboard' && backendDrawerOpen ? (
          <div className="backend-drawer">
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
                {loading === 'status' ? 'Checking...' : 'Check backend'}
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

            {governance ? (
              <details className="governance-box">
                <summary>Parameter governance</summary>
                <p>{governance.notes}</p>
                <p>
                  <strong>Fitted:</strong> {governance.fitted_parameters.join(', ')}
                </p>
                <p>
                  <strong>Scenario inputs:</strong>{' '}
                  {governance.scenario_inputs.slice(0, 10).join(', ')}
                  {governance.scenario_inputs.length > 10 ? ', ...' : ''}
                </p>
              </details>
            ) : null}
          </div>
        ) : null}
      </section>

      {viewMode === 'dashboard' ? (
        <>
          <section className="panel simulation-workbench">
            {statusMessage ? (
              <p className="status ok">{statusMessage}</p>
            ) : null}
            {importMessage ? (
              <p className="status ok">{importMessage}</p>
            ) : null}
            {errorMessage ? (
              <p className="status error">{errorMessage}</p>
            ) : null}
            <article className="chart-card hero-chart-card">
              <h3>Live equation graph: P(t), S(t), and F(t)</h3>
              <p className="equation-text">
                P(t) = A * Phi * S(t)^alpha * exp(-beta*S(t)) * exp(-lambda(c)*t)
                * F(S) * gate(t), with S(t) = (C * psi) / (t_f - t + delta)
              </p>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={liveEquationTrajectory}>
                  <CartesianGrid
                    stroke={CHART_COLORS.grid}
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="time_n"
                    stroke={CHART_COLORS.axis}
                    tick={{ fill: CHART_COLORS.axis }}
                    type="number"
                    domain={[0, 1]}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke={CHART_COLORS.output}
                    tick={{ fill: CHART_COLORS.output }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 1]}
                    stroke={CHART_COLORS.focus}
                    tick={{ fill: CHART_COLORS.focus }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: CHART_COLORS.tooltipBackground,
                      border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                      borderRadius: '0.5rem',
                      color: '#d1d5db',
                    }}
                    labelFormatter={(value) =>
                      `Time (normalized): ${Number(value).toFixed(3)}`
                    }
                    labelStyle={{ color: '#d1d5db' }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="output"
                    name="P(t)"
                    stroke={CHART_COLORS.output}
                    strokeWidth={2.75}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="focus"
                    name="F(t) focus"
                    stroke={CHART_COLORS.focus}
                    strokeWidth={2.4}
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="stress"
                    name="S(t) stress"
                    stroke={CHART_COLORS.stress}
                    strokeDasharray="6 5"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="hint-text">
                <code>Time -&gt; deadline (normalized)</code>
              </p>
            </article>

            

            <div className="toolbar-row">
              <label className="field-inline">
                <span>Preset</span>
                <select
                  value={presetKey}
                  onChange={(event) =>
                    applySelectedPreset(
                      event.currentTarget.value as ScenarioPresetKey,
                    )
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
                  max={500}
                  onChange={(value) => setRuns(clampRuns(value))}
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
                {loading === 'simulate' ? 'Simulating...' : 'Run simulation'}
              </button>
            </div>

            <p className="preset-description">
              {SCENARIO_PRESETS[presetKey].description}
            </p>

            <div className="quick-slider-groups">
              {QUICK_SLIDER_GROUPS.map((group) => (
                <fieldset key={group.title} className="quick-slider-group">
                  <legend>{group.title}</legend>
                  <div className="quick-slider-list">
                    {group.sliders.map((slider) => (
                      <label
                        className="quick-slider-row"
                        key={`${group.title}-${String(slider.key)}`}
                      >
                        <InfoTooltip
                          className="quick-slider-label"
                          label={slider.label}
                          description={getPublicParameterDescription(slider.key)}
                        />
                        <input
                          type="range"
                          min={slider.min}
                          max={slider.max}
                          step={slider.step}
                          value={scenario[slider.key]}
                          onChange={(event) => {
                            const next = Number(event.currentTarget.value)
                            if (Number.isFinite(next)) {
                              updateScenarioField(
                                slider.key,
                                normalizeSliderValue(next, slider.step),
                              )
                            }
                          }}
                        />
                        <span className="quick-slider-value">
                          {formatSliderValue(scenario[slider.key], slider.step)}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            {liveTelemetry ? (
              <>
                <div className="kpi-chip-row">
                  <span className="kpi-chip">
                    phi = {formatNumber(liveTelemetry.phi)}
                  </span>
                  <span className="kpi-chip">
                    S* = {formatNumber(liveTelemetry.sStar)}
                  </span>
                  <span className="kpi-chip">
                    lambda(c) = {formatNumber(liveTelemetry.lambdaC)}
                  </span>
                  <span className="kpi-chip">
                    Xp(sigma) = {formatNumber(liveTelemetry.xp)}
                  </span>
                  <span className="kpi-chip">
                    D_max = {formatNumber(liveTelemetry.dMax)}
                  </span>
                  <span className="kpi-chip">
                    P_peak = {formatNumber(liveTelemetry.peakOutput)}
                  </span>
                  <span className="kpi-chip">
                    t_peak = {formatNumber(liveTelemetry.peakTime)}
                  </span>
                  <span className="kpi-chip">
                    Omega_final = {formatNumber(liveTelemetry.omegaFinal)}
                  </span>
                  <span className="kpi-chip">
                    F_final = {formatNumber(liveTelemetry.focusFinal)}
                  </span>
                  <span className="kpi-chip">
                    psi = {formatNumber(liveTelemetry.psi)}
                  </span>
                  <span className="kpi-chip">
                    p = {formatNumber(liveTelemetry.probability)}
                  </span>
                </div>

                <article className="chart-card">
                  <h3>Cumulative output (live integral)</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={liveEquationTrajectory}>
                      <CartesianGrid
                        stroke={CHART_COLORS.grid}
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="time_n"
                        stroke={CHART_COLORS.axis}
                        tick={{ fill: CHART_COLORS.axis }}
                        type="number"
                        domain={[0, 1]}
                      />
                      <YAxis
                        stroke={CHART_COLORS.omega}
                        tick={{ fill: CHART_COLORS.omega }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: CHART_COLORS.tooltipBackground,
                          border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                          borderRadius: '0.5rem',
                          color: '#d1d5db',
                        }}
                        labelFormatter={(value) =>
                          `Time (normalized): ${Number(value).toFixed(3)}`
                        }
                        labelStyle={{ color: '#d1d5db' }}
                      />
                      <Legend
                        iconType="plainline"
                        iconSize={24}
                        verticalAlign="bottom"
                        align="center"
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative_output"
                        name="Integral of P(t)"
                        stroke={CHART_COLORS.omega}
                        fill="rgba(215, 148, 47, 0.24)"
                        strokeWidth={2.4}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="hint-text">
                    <code>Time (normalized)</code> &nbsp;•&nbsp;{' '}
                    <code className="omega-equation">
                      &Omega;(t) = &int; P(t) dt
                    </code>
                  </p>
                </article>
              </>
            ) : null}

            {advancedMode && simulation ? (
              <>
                <article className="chart-card">
                  <h3>Backend simulation trajectory</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={simulation.trajectory}>
                      <CartesianGrid
                        stroke={CHART_COLORS.grid}
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="time"
                        stroke={CHART_COLORS.axis}
                        tick={{ fill: CHART_COLORS.axis }}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke={CHART_COLORS.output}
                        tick={{ fill: CHART_COLORS.output }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 1]}
                        stroke={CHART_COLORS.focus}
                        tick={{ fill: CHART_COLORS.focus }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: CHART_COLORS.tooltipBackground,
                          border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                          borderRadius: '0.5rem',
                          color: '#d1d5db',
                        }}
                        labelStyle={{ color: '#d1d5db' }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="output"
                        name="P(t)"
                        stroke={CHART_COLORS.output}
                        strokeWidth={2.75}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="focus"
                        name="F(t) focus"
                        stroke={CHART_COLORS.focus}
                        strokeWidth={2.4}
                        dot={false}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="stress"
                        name="S(t) stress"
                        stroke={CHART_COLORS.stress}
                        strokeDasharray="6 5"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </article>

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
              </>
            ) : null}
          </section>

          <section className="panel advanced-editor-panel">
            <details
              open={advancedMode}
              onToggle={(event) => {
                setAdvancedMode(event.currentTarget.open)
              }}
            >
              <summary>Advanced parameter editor</summary>
              <p className="preset-description">
                Full precision numeric controls for all model parameters.
              </p>
              <div className="field-groups">
                {FIELD_GROUPS.map((group) => (
                  <fieldset key={group.title} className="field-group">
                    <legend>{group.title}</legend>
                    <div className="field-grid">
                      {group.fields.map((field) => (
                        <label className="field-cell" key={String(field.key)}>
                          <InfoTooltip
                            label={field.label}
                            description={getPublicParameterDescription(field.key)}
                          />
                          <NumberInput
                            value={scenario[field.key]}
                            step={field.step}
                            min={field.min}
                            max={field.max}
                            onChange={(value) =>
                              updateScenarioField(field.key, value)
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </details>
          </section>

          <section className="panel secondary-tabs-panel">
            <div className="section-header">
              <h2>Secondary tools</h2>
              <p>Sensitivity and interventions below the fold.</p>
            </div>
            <div className="secondary-tabs">
              <button
                type="button"
                className={secondaryTab === 'analysis' ? '' : 'secondary'}
                onClick={() => setSecondaryTab('analysis')}
              >
                Sensitivity
              </button>
              <button
                type="button"
                className={secondaryTab === 'interventions' ? '' : 'secondary'}
                onClick={() => setSecondaryTab('interventions')}
              >
                Interventions
              </button>
            </div>
          </section>

          {secondaryTab === 'analysis' ? (
            <section className="panel">
              <div className="section-header">
                <h2>Sensitivity analysis</h2>
                <p>
                  Ranked local impacts from <code>/sensitivity</code> to identify
                  dominant vs weak sliders.
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
                    placeholder="e.g. consequence pressure, stress activation sensitivity"
                  />
                </label>

                <label className="field-inline">
                  <span>Target</span>
                  <select
                    value={sensitivityTarget}
                    onChange={(event) =>
                      setSensitivityTarget(
                        event.currentTarget.value as SensitivityTarget,
                      )
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
                    ? 'Analyzing...'
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
                          <td>
                            <InfoTooltip
                              label={getPublicParameterLabelWithKey(item.parameter)}
                              description={getPublicParameterDescriptionFromKey(
                                item.parameter,
                              )}
                            />
                          </td>
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
          ) : null}

          {secondaryTab === 'interventions' ? (
            <section className="panel">
              <div className="section-header">
                <h2>Intervention comparison</h2>
                <p>
                  Configure intervention scenarios and compare them with baseline
                  using <code>/compare-interventions</code>.
                </p>
              </div>

              <div className="toolbar-row">
                <button
                  type="button"
                  className="secondary"
                  onClick={addIntervention}
                >
                  Add intervention
                </button>
                <button
                  type="button"
                  onClick={runComparison}
                  disabled={loading === 'compare'}
                >
                  {loading === 'compare'
                    ? 'Comparing...'
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
                        <InfoTooltip
                          label="Consequence pressure"
                          description={getPublicParameterDescription('C')}
                        />
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
                        <InfoTooltip
                          label="Deadline time"
                          description={getPublicParameterDescription('t_f')}
                        />
                        <NumberInput
                          value={item.scenario.t_f}
                          step={0.01}
                          onChange={(value) =>
                            updateInterventionField(item.id, 't_f', value)
                          }
                        />
                      </label>
                      <label className="field-cell">
                        <InfoTooltip
                          label="Task stimulation level"
                          description={getPublicParameterDescription('sigma_task')}
                        />
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
                        <InfoTooltip
                          label="Identity alignment"
                          description={getPublicParameterDescription('iota')}
                        />
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
                        <InfoTooltip
                          label="Irreversibility level"
                          description={getPublicParameterDescription('rho')}
                        />
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
                          <th>d Omega</th>
                          <th>d Probability</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Baseline</td>
                          <td>{formatNumber(comparison.baseline.omega)}</td>
                          <td>{formatNumber(comparison.baseline.probability)}</td>
                          <td>--</td>
                          <td>--</td>
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
                        <CartesianGrid
                          stroke={CHART_COLORS.grid}
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="name"
                          stroke={CHART_COLORS.axis}
                          tick={{ fill: CHART_COLORS.axis }}
                        />
                        <YAxis
                          domain={[0, 1]}
                          stroke={CHART_COLORS.axis}
                          tick={{ fill: CHART_COLORS.axis }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: CHART_COLORS.tooltipBackground,
                            border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                            borderRadius: '0.5rem',
                            color: '#d1d5db',
                          }}
                          labelStyle={{ color: '#d1d5db' }}
                        />
                        <Legend />
                        <Bar dataKey="probability" fill={CHART_COLORS.output} />
                      </BarChart>
                    </ResponsiveContainer>
                  </article>
                </>
              ) : null}
            </section>
          ) : null}
        </>
      ) : (
        <PresentationView />
      )}
    </div>
  )
}

export default App
