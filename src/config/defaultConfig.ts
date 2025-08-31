import { AppConfig } from './types';

export const defaultConfig: AppConfig = {
  network: {
    endpoints: {
      api: process.env.API_URL || 'https://api.example.com',
      websocket: process.env.WS_URL || 'wss://ws.example.com',
      cdn: process.env.CDN_URL || 'https://cdn.example.com'
    },
    timeout: 30000,
    retryStrategy: {
      maxAttempts: 3,
      backoffMs: 1000,
      maxBackoffMs: 10000
    }
  },
  performance: {
    metrics: {
      enabled: true,
      sampleRate: 0.1,
      flushIntervalMs: 60000,
      maxStorageSize: 1000
    },
    tracing: {
      enabled: true,
      samplingRate: 0.01
    }
  },
  security: {
    encryption: {
      algorithm: 'AES-256-GCM',
      keySize: 256,
      saltRounds: 10
    },
    authentication: {
      tokenExpiryMs: 3600000, // 1 hour
      refreshTokenExpiryMs: 2592000000, // 30 days
      maxLoginAttempts: 3,
      lockoutDurationMs: 300000 // 5 minutes
    },
    messages: {
      maxRetentionDays: 30,
      autoDeleteEnabled: true
    }
  },
  features: {
    darkMode: true,
    beta: false,
    analytics: true
  },
  version: '1.0.0'
};
