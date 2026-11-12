import type { ScheduledEvent } from './ScheduledEvent'
import type { ScheduledEventSnapshot } from './types'

/** Календарь будущих событий, отсортированный по ключу события */
export class EventCalendar {
  // в календаре не больше N + M событий, поэтому хватает отсортированного массива
  private readonly events: ScheduledEvent[] = []
  private nextSequenceNumber = 1

  add(event: ScheduledEvent): void {
    event.setSequenceNumber(this.nextSequenceNumber++)
    const index = this.events.findIndex(e => event.isBefore(e))
    if (index === -1) this.events.push(event)
    else this.events.splice(index, 0, event)
  }

  next(): ScheduledEvent {
    return this.events.shift()!
  }

  isEmpty(): boolean {
    return this.events.length === 0
  }

  snapshot(): ScheduledEventSnapshot[] {
    return this.events.map(e => e.snapshot())
  }
}
