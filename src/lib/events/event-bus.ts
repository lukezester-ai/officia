import type { DomainEvent, EventHandler } from './types';

type ListenerEntry = {
  handler: EventHandler;
  label: string;
};

class EventBus {
  private listeners = new Map<string, ListenerEntry[]>();

  on(eventType: DomainEvent['type'], handler: EventHandler, label?: string) {
    const key = eventType;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push({
      handler,
      label: label || `listener:${key}:${this.listeners.get(key)!.length}`,
    });
  }

  async emit(event: DomainEvent) {
    const entries = this.listeners.get(event.type) || [];
    const results = await Promise.allSettled(
      entries.map(async (entry) => {
        try {
          await entry.handler(event);
        } catch (error) {
          console.error(`[EventBus] ${entry.label} failed for ${event.type}:`, error);
        }
      }),
    );
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`[EventBus] ${failures.length}/${entries.length} listeners failed for ${event.type}`);
    }
  }

  remove(eventType: string, handler: EventHandler) {
    const entries = this.listeners.get(eventType);
    if (!entries) return;
    const idx = entries.findIndex((e) => e.handler === handler);
    if (idx >= 0) entries.splice(idx, 1);
  }

  clear() {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
