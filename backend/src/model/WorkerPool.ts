import type { Request } from './Request'
import type { Worker } from './Worker'

/** Набор приборов и указатель кольцевого выбора */
export class WorkerPool {
  private readonly workers: Worker[]
  private workerPointer = 0

  constructor(workers: Worker[]) {
    this.workers = workers
  }

  /** Д2П2: первый свободный прибор по кольцу от указателя; указатель не меняется */
  findFreeByRing(): number | null {
    for (let k = 0; k < this.workers.length; k++) {
      const index = (this.workerPointer + k) % this.workers.length
      if (this.workers[index].isFree()) return index
    }
    return null
  }

  /** Назначает заявку и переводит указатель за выбранный прибор */
  start(workerId: number, request: Request, time: number): number {
    const finishAt = this.workers[workerId].start(request, time)
    this.workerPointer = (workerId + 1) % this.workers.length
    return finishAt
  }

  finish(workerId: number, time: number): Request {
    return this.workers[workerId].finish(time)
  }

  getWorkers(): readonly Worker[] {
    return this.workers
  }

  getPointer(): number {
    return this.workerPointer
  }
}
