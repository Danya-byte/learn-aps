/** ID заявки: «источник.номер», например "2.3" */
export type RequestId = string

export type RequestStatus = 'CREATED' | 'IN_BUFFER' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'
export type EventType = 'ARRIVAL' | 'COMPLETION'
export type ActionKind = 'GENERATED' | 'REJECTED' | 'BUFFERED' | 'SELECTED' | 'STARTED' | 'COMPLETED'

export interface RandomGenerator {
  /** Равномерное число из [0, 1) */
  next(): number
}

export interface SearchParams {
  query: string
  category: string
}

export interface SimulationConfig {
  /** λᵢ для каждого источника; источник i+1 — элемент i */
  lambdas: number[]
  workerCount: number
  bufferCapacity: number
  /** Границы ПЗ2: U[a, b] */
  serviceMin: number
  serviceMax: number
  /** T — генерация до T включительно */
  generationHorizon: number
  seed: number
}

export interface SourceSnapshot {
  id: number
  lambda: number
  sequenceNumber: number
  generated: number
  rejected: number
  rejectPercent: number
}

export interface RequestSnapshot {
  id: RequestId
  sourceId: number
  status: RequestStatus
  createdAt: number
  serviceStartedAt: number | null
  completedAt: number | null
  rejectedAt: number | null
}

export type BufferSnapshot = (RequestSnapshot | null)[]

export interface WorkerSnapshot {
  id: number
  request: RequestSnapshot | null
  finishAt: number | null
  utilization: number
}

export interface WorkerPoolSnapshot {
  workers: WorkerSnapshot[]
  workerPointer: number
}

export interface BatchSnapshot {
  sourceId: number
  initialIds: RequestId[]
  waitingIds: RequestId[]
  inServiceIds: RequestId[]
}

export interface ScheduledEventSnapshot {
  time: number
  type: EventType
  sequenceNumber: number
  sourceId: number | null
  workerId: number | null
  requestId: RequestId | null
}

export interface ActiveService {
  requestId: RequestId
  sourceId: number
  startedAt: number
}

export interface JournalEntry {
  time: number
  order: number
  kind: ActionKind
  requestId: RequestId
  workerId: number | null
}

export interface StatisticsSnapshot {
  generated: number
  completed: number
  rejected: number
  rejectPercent: number
}

export interface StepSnapshot {
  time: number
  event: ScheduledEventSnapshot
  sources: SourceSnapshot[]
  buffer: BufferSnapshot
  batch: BatchSnapshot | null
  pool: WorkerPoolSnapshot
  calendar: ScheduledEventSnapshot[]
  journal: JournalEntry[]
  statistics: StatisticsSnapshot
}

export interface SourceReport {
  sourceId: number
  generated: number
  completed: number
  rejected: number
  rejectProbability: number
  /** null — нет наблюдений, в таблице «—» */
  meanWaiting: number | null
  meanService: number | null
  meanSystem: number | null
  varianceWaiting: number | null
  varianceService: number | null
}

export interface WorkerReport {
  workerId: number
  utilization: number
}

export interface StatisticsReport {
  sources: SourceReport[]
  workers: WorkerReport[]
  observationTime: number
  totalGenerated: number
  totalRejected: number
  rejectProbability: number
  meanSystem: number | null
  meanUtilization: number
}
