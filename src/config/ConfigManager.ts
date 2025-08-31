import { Platform } from 'react-native';
import { ErrorHandlerConfig } from '../utils/ErrorHandling';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base Configuration Types
export interface BaseConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  debug: boolean;
}

// Performance Configuration
export interface PerformanceConfig {
  metrics: {
    enabled: boolean;
    sampleRate: number;
    maxStorageSize: number;
    flushIntervalMs: number;
  };
  monitoring: {
    enabled: boolean;
    threshold: {
      cpu: number;
      memory: number;
      responseTime: number;
    };
  };
  // Add new tracing configuration
  tracing?: {
    enabled: boolean;
    samplingRate: number;
  };
}

// Network Configuration
export interface NetworkConfig {
  timeout: number;
  retryStrategy: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
  };
  endpoints: {
    api: string;
    websocket: string;
    cdn?: string; // Added CDN endpoint
  };
}

// Complete App Configuration
export interface AppConfig extends BaseConfig {
  performance: PerformanceConfig;
  network: NetworkConfig;
  errorHandling: ErrorHandlerConfig;
  // Add new security configuration
  security?: {
    encryption: {
      algorithm: string;
      keySize: number;
    };
    authentication: {
      tokenExpiryMs: number;
      refreshTokenExpiryMs: number;
    };
  };
  // Add feature flags
  features?: Record<string, boolean>;
}

// Default Configuration
const defaultConfig: AppConfig = {
  version: '1.0.0',
  environment: __DEV__ ? 'development' : 'production',
  debug: __DEV__,
  
  performance: {
    metrics: {
      enabled: true,
      sampleRate: 0.1,
      maxStorageSize: 1000,
      flushIntervalMs: 30000,
    },
    monitoring: {
      enabled: true,
      threshold: {
        cpu: 80,
        memory: 85,
        responseTime: 5000,
      },
    },
  },
  
  network: {
    timeout: 30000,
    retryStrategy: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
    },
    endpoints: {
      api: 'https://api.example.com',
      websocket: 'wss://ws.example.com',
    },
  },
  
  errorHandling: {
    timeoutMs: 5000,
    retryAttempts: 3,
    retryDelay: 1000,
    shouldRetry: (error: Error) => {
      // Default retry strategy
      const retryableErrors = ['NetworkError', 'TimeoutError'];
      return retryableErrors.includes(error.name);
    },
    onError: (error: Error) => {
      console.error('Operation failed:', error);
    },
  },
};

// Environment-specific configurations
const environmentConfigs: Record<string, Partial<AppConfig>> = {
  development: {
    debug: true,
    network: {
      endpoints: {
        api: 'http://localhost:3000',
        websocket: 'ws://localhost:3001',
      },
    },
  },
  staging: {
    network: {
      endpoints: {
        api: 'https://staging-api.example.com',
        websocket: 'wss://staging-ws.example.com',
      },
    },
  },
  production: {
    debug: false,
    performance: {
      metrics: {
        sampleRate: 0.01,
      },
    },
  },
};

// Platform-specific configurations
const platformConfigs: Record<string, Partial<AppConfig>> = {
  ios: {
    performance: {
      monitoring: {
        threshold: {
          memory: 80,
        },
      },
    },
  },
  android: {
    performance: {
      monitoring: {
        threshold: {
          memory: 70,
        },
      },
    },
  },
};

class ConfigManager {
  private static instance: ConfigManager;
  private currentConfig: AppConfig;
  private subscribers: Set<(config: AppConfig) => void>;
  private readonly STORAGE_KEY = '@AppConfig';

  private constructor() {
    this.currentConfig = defaultConfig;
    this.subscribers = new Set();
    this.initializeConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private async initializeConfig(): Promise<void> {
    const environment = this.currentConfig.environment;
    const platform = Platform.OS;

    // Merge configurations in order: default -> environment -> platform -> stored -> runtime
    this.currentConfig = this.mergeConfigs(
      defaultConfig,
      environmentConfigs[environment] || {},
      platformConfigs[platform] || {},
    );

    // Load stored configuration
    await this.loadStoredConfig();
  }

  private async loadStoredConfig(): Promise<void> {
    try {
      const storedConfig = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        this.updateConfig(parsedConfig);
      }
    } catch (error) {
      console.error('Failed to load stored config:', error);
    }
  }

  public getConfig(): AppConfig {
    return { ...this.currentConfig };
  }

  public updateConfig(partialConfig: Partial<AppConfig>): void {
    this.currentConfig = this.mergeConfigs(this.currentConfig, partialConfig);
    this.notifySubscribers();
    this.persistConfig();
  }

  public subscribe(callback: (config: AppConfig) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(this.getConfig());
      } catch (error) {
        console.error('Error in config subscriber:', error);
      }
    });
  }

  private async persistConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentConfig));
    } catch (error) {
      console.error('Failed to persist config:', error);
    }
  }

  private mergeConfigs(...configs: Partial<AppConfig>[]): AppConfig {
    return configs.reduce((merged, config) => {
      return this.deepMerge(merged, config);
    }, {} as AppConfig);
  }

  private deepMerge(target: any, source: any): any {
    if (source === null || typeof source !== 'object') return source;
    if (target === null || typeof target !== 'object') target = {};

    Object.keys(source).forEach(key => {
      if (source[key] instanceof Object && !Array.isArray(source[key])) {
        target[key] = this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });

    return target;
  }

  // Utility methods
  public isDebugMode(): boolean {
    return this.currentConfig.debug;
  }

  public getEnvironment(): string {
    return this.currentConfig.environment;
  }

  public getNetworkConfig(): NetworkConfig {
    return { ...this.currentConfig.network };
  }

  public getPerformanceConfig(): PerformanceConfig {
    return { ...this.currentConfig.performance };
  }

  public getErrorHandlingConfig(): ErrorHandlerConfig {
    return { ...this.currentConfig.errorHandling };
  }

  public getFeatureFlag(key: string): boolean {
    return this.currentConfig.features?.[key] ?? false;
  }

  public async resetToDefaults(): Promise<void> {
    this.currentConfig = defaultConfig;
    await this.persistConfig();
    this.notifySubscribers();
  }
}

export const configManager = ConfigManager.getInstance();

