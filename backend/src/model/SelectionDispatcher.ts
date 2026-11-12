import { BatchState } from './BatchState'
import type { Buffer } from './Buffer'
import type { EventCalendar } from './EventCalendar'
import { ScheduledEvent } from './ScheduledEvent'
import type { StatisticsCollector } from './StatisticsCollector'
import type { WorkerPool } from './WorkerPool'
import type { BatchSnapshot, RequestId } from './types'

/** Диспетчер выбора — планировщик обработки обновлений: формирует пакет (Д2Б5) и назначает приборы (Д2П2) */
export class SelectionDispatcher {
  private readonly buffer: Buffer
  private readonly pool: WorkerPool
  private readonly calendar: EventCalendar
  private readonly statistics: StatisticsCollector
  private batch: BatchState | null = null

  constructor(buffer: Buffer, pool: WorkerPool, calendar: EventCalendar, statistics: StatisticsCollector) {
    this.buffer = buffer
    this.pool = pool
    this.calendar = calendar
    this.statistics = statistics
  }

  onEvicted(id: RequestId): void {
    this.batch?.removeEvicted(id)
  }

  onCompleted(id: RequestId): void {
    this.batch?.markCompleted(id)
  }

  /** Триггер — поступление заявки или завершение обслуживания */
  dispatch(time: number): void {
    if (this.batch?.isFinished()) this.batch = null

    if (this.batch === null) {
      if (this.pool.findFreeByRing() === null) return
      const requests = this.buffer.snapshotHighestPriority()
      if (requests.length === 0) return
      this.batch = BatchState.fromSnapshot(requests) // состав фиксируется перед первым назначением
    }

    let id = this.batch.nextWaiting()
    let workerId = this.pool.findFreeByRing()
    while (id !== null && workerId !== null) {
      const request = this.buffer.extract(id)
      this.statistics.recordAction('SELECTED', id, time)
      this.batch.markStarted(id)
      const finishAt = this.pool.start(workerId, request, time)
      this.statistics.recordStart(request, workerId, time)
      this.calendar.add(ScheduledEvent.completion(finishAt, workerId, id))
      id = this.batch.nextWaiting()
      workerId = this.pool.findFreeByRing()
    }
  }

  snapshot(): BatchSnapshot | null {
    return this.batch?.snapshot() ?? null
  }
}
