import type { EventType, RequestId, ScheduledEventSnapshot } from './types'

/** Событие календаря: поступление заявки или завершение обслуживания */
export class ScheduledEvent {
  private readonly time: number
  private readonly type: EventType
  private sequenceNumber = 0
  private readonly sourceId: number | null
  private readonly workerId: number | null
  private readonly requestId: RequestId | null

  private constructor(time: number, type: EventType, sourceId: number | null, workerId: number | null, requestId: RequestId | null) {
    this.time = time
    this.type = type
    this.sourceId = sourceId
    this.workerId = workerId
    this.requestId = requestId
  }

  static arrival(time: number, sourceId: number): ScheduledEvent {
    return new ScheduledEvent(time, 'ARRIVAL', sourceId, null, null)
  }

  static completion(time: number, workerId: number, requestId: RequestId): ScheduledEvent {
    return new ScheduledEvent(time, 'COMPLETION', null, workerId, requestId)
  }

  getTime(): number {
    return this.time
  }

  getType(): EventType {
    return this.type
  }

  getSourceId(): number {
    return this.sourceId!
  }

  getWorkerId(): number {
    return this.workerId!
  }

  /** Номер присваивает календарь при добавлении */
  setSequenceNumber(value: number): void {
    this.sequenceNumber = value
  }

  /** Ключ (time, typePriority, sequenceNumber): COMPLETION раньше ARRIVAL */
  isBefore(other: ScheduledEvent): boolean {
    if (this.time !== other.time) return this.time < other.time
    if (this.type !== other.type) return this.type === 'COMPLETION'
    return this.sequenceNumber < other.sequenceNumber
  }

  snapshot(): ScheduledEventSnapshot {
    return {
      time: this.time,
      type: this.type,
      sequenceNumber: this.sequenceNumber,
      sourceId: this.sourceId,
      workerId: this.workerId,
      requestId: this.requestId,
    }
  }
}
