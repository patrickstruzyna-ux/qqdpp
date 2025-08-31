import { configManager } from '../config/ConfigManager';

export class ApiService {
  private config = configManager.getNetworkConfig();
  private unsubscribe: (() => void) | null = null;

  constructor() {
    // Auf Konfigurationsänderungen hören
    this.unsubscribe = configManager.subscribe((newConfig) => {
      this.config = newConfig.network;
      this.initializeWithNewConfig();
    });
  }

  private initializeWithNewConfig(): void {
    // API neu initialisieren mit aktualisierten Einstellungen
    this.setupAxiosDefaults();
  }

  private setupAxiosDefaults(): void {
    axios.defaults.baseURL = this.config.endpoints.api;
    axios.defaults.timeout = this.config.timeout;
  }

  public async fetchData<T>(endpoint: string): Promise<T> {
    try {
      const response = await axios.get(endpoint, {
        timeout: this.config.timeout,
        retry: this.config.retryStrategy.maxAttempts,
      });
      return response.data;
    } catch (error) {
      // Fehlerbehandlung basierend auf Konfiguration
      if (this.shouldRetry(error)) {
        return this.retryRequest(endpoint);
      }
      throw error;
    }
  }

  private shouldRetry(error: any): boolean {
    return error.response?.status >= 500 && 
           this.config.retryStrategy.maxAttempts > 0;
  }

  public cleanup(): void {
    // Subscription beenden wenn Service nicht mehr benötigt wird
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}