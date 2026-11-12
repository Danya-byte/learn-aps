import type { AutoResult } from '../../backend/src/model/autoRun'
import type { SimulationConfig, StatisticsReport, StepSnapshot } from '../../backend/src/model/types'

// Типы ответов описаны в backend и подключаются только как типы — код модели во фронт не попадает
export type * from '../../backend/src/model/types'
export type { AutoResult }

async function post<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? `Ошибка сервера ${response.status}`)
  return data as T
}

export function createSimulation(config: SimulationConfig): Promise<{ id: string }> {
  return post('/api/simulations', config)
}

/** step = null — система пуста, тогда в report итог прогона */
export function nextStep(id: string): Promise<{ step: StepSnapshot | null; report: StatisticsReport | null }> {
  return post(`/api/simulations/${id}/step`)
}

export function runAuto(config: SimulationConfig): Promise<AutoResult> {
  return post('/api/auto', config)
}
