import { Buffer } from './Buffer'
import { EventCalendar } from './EventCalendar'
import { PlacementDispatcher } from './PlacementDispatcher'
import { createRandom } from './random'
import { ScheduledEvent } from './ScheduledEvent'
import { SelectionDispatcher } from './SelectionDispatcher'
import { Source } from './Source'
import { StatisticsCollector } from './StatisticsCollector'
import { Worker } from './Worker'
import { WorkerPool } from './WorkerPool'
import type { RandomGenerator, SimulationConfig, StatisticsReport, StepSnapshot } from './types'

/** Позволяет подменить генераторы (используется в тесте контрольного сценария) */
export type RandomFactory = (kind: 'source' | 'worker', index: number) => RandomGenerator

/** Движок событийного моделирования по принципу особых событий */
export class SimulationEngine {
  private now = 0
  private readonly generationHorizon: number
  private readonly sources: Source[]
  private readonly buffer: Buffer
  private readonly pool: WorkerPool
  private readonly calendar = new EventCalendar()
  private readonly placement: PlacementDispatcher
  private readonly selection: SelectionDispatcher
  private readonly statistics: StatisticsCollector

  constructor(config: SimulationConfig, randomFactory?: RandomFactory) {
    const random: RandomFactory =
      randomFactory ?? ((kind, index) => createRandom(config.seed * 1000 + (kind === 'source' ? 0 : 500) + index))
    this.generationHorizon = config.generationHorizon
    this.sources = config.lambdas.map((lambda, i) => new Source(i + 1, lambda, random('source', i)))
    this.buffer = new Buffer(config.bufferCapacity)
    const workers = Array.from(
      { length: config.workerCount },
      (_, i) => new Worker(i, config.serviceMin, config.serviceMax, random('worker', i)),
    )
    this.pool = new WorkerPool(workers)
    this.statistics = new StatisticsCollector(this.sources.length, workers.length)
    this.placement = new PlacementDispatcher(this.buffer)
    this.selection = new SelectionDispatcher(this.buffer, this.pool, this.calendar, this.statistics)
  }

  initialize(): void {
    for (const source of this.sources) this.scheduleArrival(source, 0)
  }

  /** Один шаг = одно особое событие; null — система пуста, моделирование окончено */
  step(): StepSnapshot | null {
    const event = this.processNext()
    return event ? this.captureStep(event) : null
  }

  run(): StatisticsReport {
    while (this.processNext()) {
      this.statistics.takeJournal() // в автоматическом режиме журнал не нужен
    }
    return this.report()
  }

  report(): StatisticsReport {
    return this.statistics.report(Math.max(this.generationHorizon, this.now))
  }

  private processNext(): ScheduledEvent | null {
    if (this.calendar.isEmpty()) return null
    const event = this.calendar.next()
    this.now = event.getTime()
    if (event.getType() === 'ARRIVAL') this.handleArrival(event)
    else this.handleCompletion(event)
    return event
  }

  private handleArrival(event: ScheduledEvent): void {
    const source = this.sources[event.getSourceId() - 1]
    const request = source.generate(this.now)
    this.statistics.recordGenerated(request, this.now)
    this.scheduleArrival(source, this.now) // ИБ: следующая заявка не ждёт текущую

    const evicted = this.placement.place(request, this.now)
    if (evicted) {
      this.statistics.recordRejected(evicted, this.now)
      this.selection.onEvicted(evicted.getId())
    }
    this.statistics.recordAction('BUFFERED', request.getId(), this.now)
    this.selection.dispatch(this.now)
  }

  private handleCompletion(event: ScheduledEvent): void {
    const workerId = event.getWorkerId()
    const request = this.pool.finish(workerId, this.now)
    this.statistics.recordCompleted(request, workerId, this.now)
    this.selection.onCompleted(request.getId())
    this.selection.dispatch(this.now)
  }

  private scheduleArrival(source: Source, time: number): void {
    const next = source.nextArrival(time)
    if (next <= this.generationHorizon) this.calendar.add(ScheduledEvent.arrival(next, source.getId()))
  }

  private captureStep(event: ScheduledEvent): StepSnapshot {
    const time = this.now
    return {
      time,
      event: event.snapshot(),
      sources: this.sources.map(s => {
        const generated = this.statistics.getGenerated(s.getId())
        const rejected = this.statistics.getRejected(s.getId())
        return { ...s.snapshot(), generated, rejected, rejectPercent: generated === 0 ? 0 : (rejected / generated) * 100 }
      }),
      buffer: this.buffer.snapshot(),
      batch: this.selection.snapshot(),
      pool: {
        workerPointer: this.pool.getPointer(),
        workers: this.pool.getWorkers().map(w => ({
          id: w.getId(),
          request: w.getCurrentRequest()?.snapshot() ?? null,
          finishAt: w.getFinishAt(),
          utilization: this.statistics.utilization(w.getId(), time),
        })),
      },
      calendar: this.calendar.snapshot(),
      journal: this.statistics.takeJournal(),
      statistics: this.statistics.snapshot(time),
    }
  }
}
