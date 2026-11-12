import type { Request } from './Request'
import type { BatchSnapshot, RequestId } from './types'

/** Д2Б5: зафиксированный пакет заявок одного источника */
export class BatchState {
  private readonly sourceId: number
  private readonly initialIds: Set<RequestId>
  /** Упорядочен по (createdAt, id) */
  private readonly waitingIds: RequestId[]
  private readonly inServiceIds = new Set<RequestId>()

  private constructor(sourceId: number, orderedIds: RequestId[]) {
    this.sourceId = sourceId
    this.initialIds = new Set(orderedIds)
    this.waitingIds = orderedIds
  }

  static fromSnapshot(requests: Request[]): BatchState {
    const ordered = [...requests].sort((a, b) => (a.isOlderThan(b) ? -1 : 1))
    return new BatchState(ordered[0].getSourceId(), ordered.map(r => r.getId()))
  }

  nextWaiting(): RequestId | null {
    return this.waitingIds[0] ?? null
  }

  markStarted(id: RequestId): void {
    this.removeEvicted(id)
    this.inServiceIds.add(id)
  }

  removeEvicted(id: RequestId): void {
    const index = this.waitingIds.indexOf(id)
    if (index !== -1) this.waitingIds.splice(index, 1)
  }

  markCompleted(id: RequestId): void {
    this.inServiceIds.delete(id)
  }

  isFinished(): boolean {
    return this.waitingIds.length === 0 && this.inServiceIds.size === 0
  }

  snapshot(): BatchSnapshot {
    return {
      sourceId: this.sourceId,
      initialIds: [...this.initialIds],
      waitingIds: [...this.waitingIds],
      inServiceIds: [...this.inServiceIds],
    }
  }
}
