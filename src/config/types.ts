export interface NetworkConfig {
  endpoints: {
    api: string;
    websocket: string;
    cdn: string;
  };
  timeout: number;
  retryStrategy: {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
}

export interface PerformanceConfig {
  metrics: {
    enabled: boolean;
    sampleRate: number;
    flushIntervalMs: number;
    maxStorageSize: number;
  };
  tracing: {
    enabled: boolean;
    samplingRate: number;
  };
}

export interface SecurityConfig {
  encryption: {
    algorithm: string;
    keySize: number;
  };
  authentication: {
    tokenExpiryMs: number;
    refreshTokenExpiryMs: number;
  };
}

export interface AppConfig {
  network: NetworkConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  features: Record<string, boolean>;
  version: string;
}