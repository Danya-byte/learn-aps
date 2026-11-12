import type { Request } from './Request'
import type {
  ActionKind,
  ActiveService,
  JournalEntry,
  RequestId,
  SourceReport,
  StatisticsReport,
  StatisticsSnapshot,
} from './types'

/** Среднее и дисперсия по методу Уэлфорда — без хранения всех значений */
class RunningMoments {
  private count = 0
  private mean = 0
  private squaredDeviations = 0

  add(value: number): void {
    this.count++
    const delta = value - this.mean
    this.mean += delta / this.count
    this.squaredDeviations += delta * (value - this.mean)
  }

  getMean(): number | null {
    return this.count === 0 ? null : this.mean
  }

  /** Сумма квадратов отклонений / число наблюдений */
  getVariance(): number | null {
    return this.count === 0 ? null : this.squaredDeviations / this.count
  }
}

/** Сбор статистики по источникам и приборам + журнал действий текущего шага */
export class StatisticsCollector {
  private readonly generatedBySource = new Map<number, number>()
  private readonly rejectedBySource = new Map<number, number>()
  private readonly completedBySource = new Map<number, number>()
  private readonly waitingMoments = new Map<number, RunningMoments>()
  private readonly serviceMoments = new Map<number, RunningMoments>()
  private readonly systemMoments = new Map<number, RunningMoments>()
  private readonly busyTimeByWorker = new Map<number, number>()
  private readonly activeByWorker = new Map<number, ActiveService>()
  private journal: JournalEntry[] = []

  constructor(sourceCount: number, workerCount: number) {
    for (let id = 1; id <= sourceCount; id++) {
      this.generatedBySource.set(id, 0)
      this.rejectedBySource.set(id, 0)
      this.completedBySource.set(id, 0)
      this.waitingMoments.set(id, new RunningMoments())
      this.serviceMoments.set(id, new RunningMoments())
      this.systemMoments.set(id, new RunningMoments())
    }
    for (let id = 0; id < workerCount; id++) this.busyTimeByWorker.set(id, 0)
  }

  recordGenerated(request: Request, time: number): void {
    increment(this.generatedBySource, request.getSourceId())
    this.log('GENERATED', request.getId(), time, null)
  }

  recordRejected(request: Request, time: number): void {
    increment(this.rejectedBySource, request.getSourceId())
    this.log('REJECTED', request.getId(), time, null)
  }

  recordStart(request: Request, workerId: number, time: number): void {
    this.activeByWorker.set(workerId, { requestId: request.getId(), sourceId: request.getSourceId(), startedAt: time })
    this.waitingMoments.get(request.getSourceId())!.add(time - request.getCreatedAt())
    this.log('STARTED', request.getId(), time, workerId)
  }

  recordCompleted(request: Request, workerId: number, time: number): void {
    const sourceId = request.getSourceId()
    const startedAt = request.getServiceStartedAt()!
    increment(this.completedBySource, sourceId)
    this.serviceMoments.get(sourceId)!.add(time - startedAt)
    this.systemMoments.get(sourceId)!.add(time - request.getCreatedAt())
    this.busyTimeByWorker.set(workerId, this.busyTimeByWorker.get(workerId)! + (time - startedAt))
    this.activeByWorker.delete(workerId)
    this.log('COMPLETED', request.getId(), time, workerId)
  }

  recordAction(kind: ActionKind, requestId: RequestId, time: number): void {
    this.log(kind, requestId, time, null)
  }

  /** Журнал хранит только действия текущего шага */
  takeJournal(): JournalEntry[] {
    const entries = this.journal
    this.journal = []
    return entries
  }

  getGenerated(sourceId: number): number {
    return this.generatedBySource.get(sourceId)!
  }

  getRejected(sourceId: number): number {
    return this.rejectedBySource.get(sourceId)!
  }

  /** Загрузка прибора с учётом уже прошедшей части текущего обслуживания */
  utilization(workerId: number, time: number): number {
    if (time === 0) return 0
    const active = this.activeByWorker.get(workerId)
    const busy = this.busyTimeByWorker.get(workerId)! + (active ? time - active.startedAt : 0)
    return busy / time
  }

  snapshot(_time: number): StatisticsSnapshot {
    const generated = sum(this.generatedBySource)
    const rejected = sum(this.rejectedBySource)
    return {
      generated,
      completed: sum(this.completedBySource),
      rejected,
      rejectPercent: generated === 0 ? 0 : (rejected / generated) * 100,
    }
  }

  report(observationTime: number): StatisticsReport {
    const sources: SourceReport[] = [...this.generatedBySource.keys()].map(id => {
      const generated = this.generatedBySource.get(id)!
      const rejected = this.rejectedBySource.get(id)!
      return {
        sourceId: id,
        generated,
        completed: this.completedBySource.get(id)!,
        rejected,
        rejectProbability: generated === 0 ? 0 : rejected / generated,
        meanWaiting: this.waitingMoments.get(id)!.getMean(),
        meanService: this.serviceMoments.get(id)!.getMean(),
        meanSystem: this.systemMoments.get(id)!.getMean(),
        varianceWaiting: this.waitingMoments.get(id)!.getVariance(),
        varianceService: this.serviceMoments.get(id)!.getVariance(),
      }
    })
    const workers = [...this.busyTimeByWorker.keys()].map(id => ({
      workerId: id,
      utilization: this.utilization(id, observationTime),
    }))
    const totalGenerated = sum(this.generatedBySource)
    const totalRejected = sum(this.rejectedBySource)
    const totalCompleted = sum(this.completedBySource)
    const systemTimeSum = sources.reduce((acc, s) => acc + (s.meanSystem ?? 0) * s.completed, 0)
    return {
      sources,
      workers,
      observationTime,
      totalGenerated,
      totalRejected,
      rejectProbability: totalGenerated === 0 ? 0 : totalRejected / totalGenerated,
      meanSystem: totalCompleted === 0 ? null : systemTimeSum / totalCompleted,
      meanUtilization: workers.reduce((acc, w) => acc + w.utilization, 0) / workers.length,
    }
  }

  private log(kind: ActionKind, requestId: RequestId, time: number, workerId: number | null): void {
    this.journal.push({ time, order: this.journal.length + 1, kind, requestId, workerId })
  }
}

function increment(map: Map<number, number>, key: number): void {
  map.set(key, map.get(key)! + 1)
}

function sum(map: Map<number, number>): number {
  let total = 0
  for (const value of map.values()) total += value
  return total
}
