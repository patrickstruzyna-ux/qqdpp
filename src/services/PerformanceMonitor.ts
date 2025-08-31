import { configManager } from '../config/ConfigManager';

export class PerformanceMonitor {
  private config = configManager.getPerformanceConfig();
  private metrics: Array<{ name: string, value: number }> = [];

  constructor() {
    // Initial-Konfiguration anwenden
    this.initialize();

    // Auf Konfigurationsänderungen reagieren
    configManager.subscribe((newConfig) => {
      this.config = newConfig.performance;
      this.updateSettings();
    });
  }

  private initialize(): void {
    if (!this.config.metrics.enabled) {
      console.log('Performance monitoring is disabled');
      return;
    }

    // Monitoring-Intervall starten
    setInterval(() => {
      this.collectMetrics();
    }, this.config.metrics.flushIntervalMs);
  }

  private updateSettings(): void {
    // Sampling-Rate aktualisieren
    if (this.config.metrics.enabled) {
      configManager.updateConfig({
        performance: {
          metrics: {
            sampleRate: 0.5, // Neue Sampling-Rate
          },
        },
      });
    }
  }

  public recordMetric(name: string, value: number): void {
    // Nur aufzeichnen wenn Sampling-Rate trifft
    if (Math.random() <= this.config.metrics.sampleRate) {
      this.metrics.push({ name, value });
    }
  }

  private collectMetrics(): void {
    if (this.metrics.length >= this.config.metrics.maxStorageSize) {
      this.flushMetrics();
    }
  }

  private flushMetrics(): void {
    // Metriken an Backend senden
    console.log('Flushing metrics:', this.metrics);
    this.metrics = [];
  }
}