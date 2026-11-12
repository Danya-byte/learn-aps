import { SimulationEngine } from './SimulationEngine'
import type { SimulationConfig, StatisticsReport } from './types'

const T_ALPHA = 1.643 // α = 0.9
const DELTA = 0.1 // относительная точность 10 %
const N0 = 100
// При p → 0 формула даёт N → ∞, поэтому N ограничен сверху
const N_MAX = 300_000

export interface AutoIteration {
  requestCount: number
  rejectProbability: number
}

export interface AutoResult {
  report: StatisticsReport
  iterations: AutoIteration[]
}

/** Число реализаций по формуле (2): N = t²(1 − p) / (p δ²) */
export function requiredRequests(p: number): number {
  if (p === 0) return N_MAX
  return Math.min(N_MAX, Math.ceil((T_ALPHA ** 2 * (1 - p)) / (p * DELTA ** 2)))
}

/** Прогон, в котором источники сгенерируют примерно N заявок: T = N / Σλ */
function runWithRequests(config: SimulationConfig, n: number): StatisticsReport {
  const totalLambda = config.lambdas.reduce((a, b) => a + b, 0)
  const engine = new SimulationEngine({ ...config, generationHorizon: n / totalLambda })
  engine.initialize()
  return engine.run()
}

/** Повторяет прогоны, пока |p₀ − p₁| ≥ 10 % от p₀ */
export function runAuto(config: SimulationConfig): AutoResult {
  const iterations: AutoIteration[] = []
  let n = N0
  let report = runWithRequests(config, n)
  iterations.push({ requestCount: report.totalGenerated, rejectProbability: report.rejectProbability })

  while (true) {
    const p0 = report.rejectProbability
    const nextN = requiredRequests(p0)
    if (nextN <= n) break
    n = nextN
    report = runWithRequests(config, n)
    const p1 = report.rejectProbability
    iterations.push({ requestCount: report.totalGenerated, rejectProbability: p1 })
    if (Math.abs(p0 - p1) < DELTA * p0 || n === N_MAX) break
  }
  return { report, iterations }
}
