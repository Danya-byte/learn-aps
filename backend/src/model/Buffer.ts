import type { Request } from './Request'
import type { BufferSnapshot, RequestId } from './types'

/** Общая ограниченная очередь обновлений, ожидающих обработки */
export class Buffer {
  private readonly capacity: number
  private readonly slots: (Request | null)[]

  constructor(capacity: number) {
    this.capacity = capacity
    this.slots = new Array(capacity).fill(null)
  }

  /** Д1ОЗ3: первое свободное место от начала буфера */
  findFirstFree(): number | null {
    const index = this.slots.indexOf(null)
    return index === -1 ? null : index
  }

  /** Д1ОО3: удаляет самую старую ожидающую заявку, ячейка остаётся пустой */
  evictOldest(): Request {
    let oldest = 0
    for (let i = 1; i < this.capacity; i++) {
      if (this.slots[i]!.isOlderThan(this.slots[oldest]!)) oldest = i
    }
    const request = this.slots[oldest]!
    this.slots[oldest] = null
    return request
  }

  put(request: Request, position: number): void {
    this.slots[position] = request
  }

  /** Д2Б5: все ожидающие заявки источника с минимальным номером */
  snapshotHighestPriority(): Request[] {
    const waiting = this.slots.filter((r): r is Request => r !== null)
    if (waiting.length === 0) return []
    const topSource = Math.min(...waiting.map(r => r.getSourceId()))
    return waiting.filter(r => r.getSourceId() === topSource)
  }

  /** Извлечение без сдвига остальных ячеек */
  extract(id: RequestId): Request {
    const index = this.slots.findIndex(r => r?.getId() === id)
    const request = this.slots[index]!
    this.slots[index] = null
    return request
  }

  snapshot(): BufferSnapshot {
    return this.slots.map(r => r?.snapshot() ?? null)
  }
}
