import type { RequestId, RequestSnapshot, RequestStatus, SearchParams } from './types'

/** Заявка — запрос на сбор актуальных предложений */
export class Request {
  private readonly id: RequestId
  private readonly sourceId: number
  private readonly sequenceNumber: number
  private readonly searchParams: SearchParams
  private readonly createdAt: number
  private serviceStartedAt: number | null = null
  private completedAt: number | null = null
  private rejectedAt: number | null = null
  private status: RequestStatus = 'CREATED'

  constructor(sourceId: number, sequenceNumber: number, createdAt: number, searchParams: SearchParams) {
    this.id = `${sourceId}.${sequenceNumber}`
    this.sourceId = sourceId
    this.sequenceNumber = sequenceNumber
    this.createdAt = createdAt
    this.searchParams = searchParams
  }

  markBuffered(): void {
    this.status = 'IN_BUFFER'
  }

  markProcessing(time: number): void {
    this.status = 'PROCESSING'
    this.serviceStartedAt = time
  }

  markCompleted(time: number): void {
    this.status = 'COMPLETED'
    this.completedAt = time
  }

  markRejected(time: number): void {
    this.status = 'REJECTED'
    this.rejectedAt = time
  }

  getId(): RequestId {
    return this.id
  }

  getSourceId(): number {
    return this.sourceId
  }

  getSequenceNumber(): number {
    return this.sequenceNumber
  }

  getCreatedAt(): number {
    return this.createdAt
  }

  getServiceStartedAt(): number | null {
    return this.serviceStartedAt
  }

  /** Порядок (createdAt, id): используется для Д1ОО3 и FIFO внутри пакета */
  isOlderThan(other: Request): boolean {
    if (this.createdAt !== other.createdAt) return this.createdAt < other.createdAt
    if (this.sourceId !== other.sourceId) return this.sourceId < other.sourceId
    return this.sequenceNumber < other.sequenceNumber
  }

  snapshot(): RequestSnapshot {
    return {
      id: this.id,
      sourceId: this.sourceId,
      status: this.status,
      createdAt: this.createdAt,
      serviceStartedAt: this.serviceStartedAt,
      completedAt: this.completedAt,
      rejectedAt: this.rejectedAt,
    }
  }
}
