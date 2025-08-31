import { AppConfig } from './types';
import { configManager } from './ConfigManager';

export class ConfigLoader {
  private static instance: ConfigLoader;

  private constructor() {}

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  public async loadEnvironmentConfig(): Promise<void> {
    const env = process.env.NODE_ENV || 'development';
    
    try {
      const config = await this.fetchConfig(env);
      configManager.updateConfig(config);
    } catch (error) {
      console.error('Failed to load environment config:', error);
    }
  }

  public async loadRemoteConfig(): Promise<void> {
    try {
      const response = await fetch('/api/config');
      const remoteConfig = await response.json();
      configManager.updateConfig(remoteConfig);
    } catch (error) {
      console.error('Failed to load remote config:', error);
    }
  }

  private async fetchConfig(env: string): Promise<Partial<AppConfig>> {
    const configMap: Record<string, Partial<AppConfig>> = {
      development: {
        network: {
          endpoints: {
            api: 'http://localhost:3000',
            websocket: 'ws://localhost:3001',
            cdn: 'http://localhost:3002'
          }
        },
        performance: {
          metrics: {
            sampleRate: 1.0
          }
        }
      },
      production: {
        performance: {
          metrics: {
            sampleRate: 0.1
          }
        }
      }
    };

    return configMap[env] || {};
  }
}