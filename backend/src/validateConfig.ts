import type { SimulationConfig } from './model/types'

const isNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const isIntInRange = (x: unknown, min: number, max: number) => Number.isInteger(x) && (x as number) >= min && (x as number) <= max

/** Проверка параметров из запроса; возвращает текст ошибки или null */
export function validateConfig(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return 'Ожидается JSON-объект с параметрами'
  const c = body as Partial<Record<keyof SimulationConfig, unknown>>

  if (!Array.isArray(c.lambdas) || c.lambdas.length < 1 || c.lambdas.length > 50) return 'lambdas: от 1 до 50 источников'
  if (!c.lambdas.every(l => isNumber(l) && l > 0)) return 'lambdas: каждое λ должно быть больше 0'
  if (!isIntInRange(c.workerCount, 1, 100)) return 'workerCount: целое от 1 до 100'
  if (!isIntInRange(c.bufferCapacity, 1, 1000)) return 'bufferCapacity: целое от 1 до 1000'
  if (!isNumber(c.serviceMin) || !isNumber(c.serviceMax) || c.serviceMin <= 0 || c.serviceMin >= c.serviceMax) {
    return 'Границы ПЗ2 должны удовлетворять 0 < a < b'
  }
  if (!isNumber(c.generationHorizon) || c.generationHorizon <= 0) return 'generationHorizon: T должно быть больше 0'
  if (!Number.isInteger(c.seed)) return 'seed: целое число'
  return null
}
