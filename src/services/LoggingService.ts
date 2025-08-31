import { configManager } from '../config/ConfigManager';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
}

export class LoggingService {
  private static instance: LoggingService;
  private logQueue: LogEntry[] = [];
  
  private constructor() {
    this.setupPeriodicFlush();
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context
    };

    this.logQueue.push(entry);
    
    if (level === 'error') {
      this.flushImmediately();
    }
  }

  private async flushImmediately() {
    if (this.logQueue.length === 0) return;

    const logs = [...this.logQueue];
    this.logQueue = [];

    try {
      await fetch(configManager.getConfig().logging.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logs)
      });
    } catch (error) {
      console.error('Failed to flush logs:', error);
    }
  }

  private setupPeriodicFlush() {
    setInterval(() => {
      this.flushImmediately();
    }, configManager.getConfig().logging.flushInterval);
  }
}

export const logger = LoggingService.getInstance();