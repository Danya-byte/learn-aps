import type { Buffer } from './Buffer'
import type { Request } from './Request'

/** Диспетчер постановки — компонент приёма обновлений: работает только с буфером, о приборах не знает */
export class PlacementDispatcher {
  private readonly buffer: Buffer

  constructor(buffer: Buffer) {
    this.buffer = buffer
  }

  /** Ставит заявку в буфер; возвращает выбитую заявку или null */
  place(request: Request, time: number): Request | null {
    let evicted: Request | null = null
    let position = this.buffer.findFirstFree() // Д1ОЗ3
    if (position === null) {
      evicted = this.buffer.evictOldest() // Д1ОО3
      evicted.markRejected(time)
      position = this.buffer.findFirstFree()!
    }
    this.buffer.put(request, position)
    request.markBuffered()
    return evicted
  }
}
