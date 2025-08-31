type Listener = (...args: any[]) => void;

export class EventEmitter {
  private events: Map<string, Set<Listener>>;

  constructor() {
    this.events = new Map();
  }

  public on(event: string, listener: Listener): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    this.events.get(event)!.add(listener);

    return () => this.off(event, listener);
  }

  public off(event: string, listener: Listener): void {
    if (this.events.has(event)) {
      this.events.get(event)!.delete(listener);
    }
  }

  public emit(event: string, ...args: any[]): void {
    if (this.events.has(event)) {
      this.events.get(event)!.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  public removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}