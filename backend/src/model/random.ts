import type { RandomGenerator } from './types'

/** Генератор mulberry32 с фиксированным зерном — прогоны воспроизводимы */
export function createRandom(seed: number): RandomGenerator {
  let state = seed >>> 0
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}
