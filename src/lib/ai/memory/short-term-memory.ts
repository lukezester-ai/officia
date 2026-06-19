// @ts-nocheck
// Управлява кратковременната памет, докато потребителят чати 
// (напр. кеширане в Redis, ако не искаме да товарим основната база за всяка буква)

export class ShortTermMemory {
  private memory = new Map<string, any[]>();

  addMessage(sessionId: string, message: any) {
    if (!this.memory.has(sessionId)) {
      this.memory.set(sessionId, []);
    }
    this.memory.get(sessionId)?.push(message);
  }

  getMessages(sessionId: string) {
    return this.memory.get(sessionId) || [];
  }

  clear(sessionId: string) {
    this.memory.delete(sessionId);
  }
}

export const shortTermMemory = new ShortTermMemory();
