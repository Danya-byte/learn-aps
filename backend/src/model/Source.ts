import { Request } from './Request'
import type { RandomGenerator, SourceSnapshot } from './types'

const CATEGORIES = ['электроника', 'одежда', 'дом', 'книги']

/** Пользовательский клиент агрегатора. ИБ, ИЗ1: бесконечный источник, пуассоновский поток с параметром λ */
export class Source {
  private readonly id: number
  private readonly lambda: number
  private sequenceNumber = 0
  private readonly rng: RandomGenerator

  constructor(id: number, lambda: number, rng: RandomGenerator) {
    this.id = id
    this.lambda = lambda
    this.rng = rng
  }

  generate(time: number): Request {
    this.sequenceNumber++
    const category = CATEGORIES[(this.id + this.sequenceNumber) % CATEGORIES.length]
    return new Request(this.id, this.sequenceNumber, time, { query: `запрос ${this.sequenceNumber}`, category })
  }

  /** ИЗ1: интервал ~ Exp(λ), метод обратной функции */
  nextArrival(time: number): number {
    return time - Math.log(1 - this.rng.next()) / this.lambda
  }

  getId(): number {
    return this.id
  }

  snapshot(): Omit<SourceSnapshot, 'generated' | 'rejected' | 'rejectPercent'> {
    return { id: this.id, lambda: this.lambda, sequenceNumber: this.sequenceNumber }
  }
}
