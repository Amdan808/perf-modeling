import type { components } from './types'

export type ModelScenario = components['schemas']['ModelScenario']
export type SimulationResponse = components['schemas']['SimulationResponse']
export type SensitivityResponse = components['schemas']['SensitivityResponse']
export type CompareResponse = components['schemas']['CompareResponse']
export type ParameterGovernanceResponse =
  components['schemas']['ParameterGovernanceResponse']

export type SimulationMode = 'deterministic' | 'stochastic'
export type SensitivityTarget = 'omega' | 'probability'

export interface SimulatePayload {
  scenario: ModelScenario
  mode: SimulationMode
  runs: number
  seed?: number | null
}

export interface SensitivityPayload {
  scenario: ModelScenario
  parameters: string[]
  relative_step: number
  target: SensitivityTarget
}

export interface ComparePayload {
  baseline: ModelScenario
  interventions: Array<{ name: string; scenario: ModelScenario }>
  mode: SimulationMode
  runs: number
  seed?: number | null
}

export class ApiError extends Error {
  readonly status: number
  readonly detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim()
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const isJson = response.headers
    .get('content-type')
    ?.toLowerCase()
    .includes('application/json')

  const payload: unknown = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    if (typeof payload === 'string') {
      detail = payload
    } else if (payload && typeof payload === 'object') {
      const maybeDetail = (payload as Record<string, unknown>).detail
      if (typeof maybeDetail === 'string') {
        detail = maybeDetail
      } else if (maybeDetail !== undefined) {
        detail = JSON.stringify(maybeDetail)
      }
    }
    throw new ApiError(response.status, detail)
  }

  return payload as T
}

async function getJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`)
  return parseJsonResponse<T>(response)
}

async function postJson<TBody, TResponse>(
  baseUrl: string,
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return parseJsonResponse<TResponse>(response)
}

export function fetchHealth(baseUrl: string): Promise<{ status: string }> {
  return getJson(baseUrl, '/health')
}

export function fetchGovernance(
  baseUrl: string,
): Promise<ParameterGovernanceResponse> {
  return getJson(baseUrl, '/parameter-governance')
}

export function fetchSimulation(
  baseUrl: string,
  payload: SimulatePayload,
): Promise<SimulationResponse> {
  return postJson(baseUrl, '/simulate', payload)
}

export function fetchSensitivity(
  baseUrl: string,
  payload: SensitivityPayload,
): Promise<SensitivityResponse> {
  return postJson(baseUrl, '/sensitivity', payload)
}

export function compareInterventions(
  baseUrl: string,
  payload: ComparePayload,
): Promise<CompareResponse> {
  return postJson(baseUrl, '/compare-interventions', payload)
}
