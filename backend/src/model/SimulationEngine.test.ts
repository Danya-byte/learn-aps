import { describe, expect, it } from 'vitest'
import { SimulationEngine } from './SimulationEngine'
import type { RandomGenerator, StepSnapshot } from './types'

// Контрольный сценарий из docs/model.md: 3 источника, 2 прибора, буфер на 2 места, T = 2
const LAMBDA = 1
const SERVICE_MIN = 0.5
const SERVICE_MAX = 3

/** Генератор, выдающий заранее рассчитанные значения */
function scripted(values: number[]): RandomGenerator {
  let i = 0
  return { next: () => values[i++] }
}

/** u для обратной функции Exp(λ), чтобы получить нужный интервал */
const arrivalsToU = (times: number[]) =>
  [...times, 99].map((t, i) => 1 - Math.exp(-(t - (times[i - 1] ?? 0)) * LAMBDA))
/** u для U[a, b], чтобы получить нужную длительность */
const durationsToU = (durations: number[]) => durations.map(d => (d - SERVICE_MIN) / (SERVICE_MAX - SERVICE_MIN))

const sourceArrivals = [
  [0.05, 1.1, 1.3],
  [0.1, 0.2, 1.4],
  [1.2],
]
const workerDurations = [
  [0.95, 3.0, 0.5], // 1.1, 2.2, 2.3
  [2.0, 0.75], // 2.1, 1.3
]

function createEngine() {
  const engine = new SimulationEngine(
    { lambdas: [LAMBDA, LAMBDA, LAMBDA], workerCount: 2, bufferCapacity: 2, serviceMin: SERVICE_MIN, serviceMax: SERVICE_MAX, generationHorizon: 2, seed: 1 },
    (kind, index) => scripted(kind === 'source' ? arrivalsToU(sourceArrivals[index]) : durationsToU(workerDurations[index])),
  )
  engine.initialize()
  return engine
}

describe('контрольный сценарий', () => {
  it('воспроизводит таблицу из docs/model.md', () => {
    const engine = createEngine()
    const steps: StepSnapshot[] = []
    for (let s = engine.step(); s; s = engine.step()) steps.push(s)

    const at = (time: number) => steps.find(s => Math.abs(s.time - time) < 1e-9)!
    const ids = (time: number) => at(time).pool.workers.map(w => w.request?.id ?? null)

    expect(steps.map(s => +s.time.toFixed(2))).toEqual([0.05, 0.1, 0.2, 1, 1.1, 1.2, 1.3, 1.4, 3, 4, 4.75, 5.25])

    expect(ids(0.05)).toEqual(['1.1', null]) // HappyFlow
    expect(at(0.05).pool.workerPointer).toBe(1)
    expect(ids(0.1)).toEqual(['1.1', null]) // 2.1 ждёт: пакет {1.1} не завершён

    expect(at(1).batch!.initialIds).toEqual(['2.1', '2.2'])
    expect(ids(1)).toEqual(['2.2', '2.1'])
    expect(at(1).pool.workerPointer).toBe(1)

    expect(at(1.3).journal.find(j => j.kind === 'REJECTED')!.requestId).toBe('1.2')
    expect(at(1.4).journal.find(j => j.kind === 'REJECTED')!.requestId).toBe('3.1')
    expect(at(1.4).batch!.initialIds).toEqual(['2.1', '2.2']) // 2.3 не дополняет пакет

    expect(ids(3)).toEqual(['2.2', null]) // прибор 1 простаивает до конца пакета
    expect(ids(4)).toEqual([null, '1.3'])
    expect(at(4).pool.workerPointer).toBe(0)
    expect(ids(4.75)).toEqual(['2.3', null])
    expect(at(4.75).pool.workerPointer).toBe(1)

    const report = engine.report()
    expect(report.totalGenerated).toBe(7)
    expect(report.totalRejected).toBe(2)
    expect(report.sources.map(s => s.rejected)).toEqual([1, 0, 1])
    expect(report.sources.reduce((a, s) => a + s.completed, 0)).toBe(5)
  })
})
