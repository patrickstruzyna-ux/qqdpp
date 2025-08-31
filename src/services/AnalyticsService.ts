import { performanceEmitter } from '../utils/Performance';

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: number;
}

export class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  
  constructor() {
    this.setupPerformanceListener();
  }

  trackEvent(category: string, action: string, label?: string, value?: number) {
    const event: AnalyticsEvent = {
      category,
      action,
      label,
      value,
      timestamp: Date.now()
    };

    this.events.push(event);
    this.sendToAnalytics(event);
  }

  private setupPerformanceListener() {
    performanceEmitter.on('metric', (metric) => {
      this.trackEvent('Performance', metric.label, undefined, metric.value);
    });
  }

  private async sendToAnalytics(event: AnalyticsEvent) {
    // Implement your analytics provider here (Google Analytics, Mixpanel, etc.)
    console.log('Analytics event:', event);
  }
}

export const analytics = new AnalyticsService();