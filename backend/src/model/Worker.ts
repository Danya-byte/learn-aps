import type { Request } from './Request'
import type { RandomGenerator } from './types'

/** Прибор — worker-процесс: приводит данные предложения к общему формату и обновляет каталог */
export class Worker {
  private readonly id: number
  private currentRequest: Request | null = null
  private finishAt: number | null = null
  private readonly serviceMin: number
  private readonly serviceMax: number
  private readonly rng: RandomGenerator

  constructor(id: number, serviceMin: number, serviceMax: number, rng: RandomGenerator) {
    this.id = id
    this.serviceMin = serviceMin
    this.serviceMax = serviceMax
    this.rng = rng
  }

  isFree(): boolean {
    return this.currentRequest === null
  }

  /** ПЗ2: длительность ~ U[a, b]; возвращает время завершения */
  start(request: Request, time: number): number {
    this.currentRequest = request
    request.markProcessing(time)
    this.finishAt = time + this.serviceMin + this.rng.next() * (this.serviceMax - this.serviceMin)
    return this.finishAt
  }

  finish(time: number): Request {
    const request = this.currentRequest!
    request.markCompleted(time)
    this.currentRequest = null
    this.finishAt = null
    return request
  }

  getId(): number {
    return this.id
  }

  getCurrentRequest(): Request | null {
    return this.currentRequest
  }

  getFinishAt(): number | null {
    return this.finishAt
  }
}
