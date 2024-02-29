export type EventHandler = <T>(value: T) => void;

export class EventEmitter<EventTypes extends string = ""> {
  private handlers: Record<string, EventHandler[]> = {};

  on(event: EventTypes, handler: EventHandler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  off(event: EventTypes, handler: EventHandler) {
    if (!this.handlers[event]) return;
    this.handlers[event] = this.handlers[event].filter(
      (item) => item !== handler
    );
  }

  emit<T>(event: EventTypes, data: T) {
    if (!this.handlers[event]) return;
    for (const handler of this.handlers[event]) {
      if (typeof handler === "function") handler(data);
    }
  }
}
