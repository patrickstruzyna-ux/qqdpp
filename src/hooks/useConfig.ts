import { useState, useEffect } from 'react';
import { AppConfig } from '../config/types';
import { configManager } from '../config/ConfigManager';

export function useConfig<T>(selector: (config: AppConfig) => T): T {
  const [value, setValue] = useState<T>(() => selector(configManager.getConfig()));

  useEffect(() => {
    const unsubscribe = configManager.subscribe((newConfig) => {
      setValue(selector(newConfig));
    });

    return unsubscribe;
  }, [selector]);

  return value;
}