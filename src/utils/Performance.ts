import { InteractionManager, Platform } from 'react-native';
import { EventEmitter } from 'events';
import { withRetry, withTimeout, createErrorBoundary, ErrorHandlerConfig } from './ErrorHandling';
import { configManager } from '../config/ConfigManager';

// Performance Event Emitter
export const performanceEmitter = new EventEmitter();

// Types
export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage?: number;
  timestamp: number;
  label: string;
}

export interface TimingResult<T> {
  result: T;
  metrics: PerformanceMetrics;
}

// Core Timing Functions
export const measureTime = (label: string) => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled || Math.random() > config.metrics.sampleRate) {
    // Return no-op version when disabled or not sampled
    return {
      end: () => ({ label, duration: 0, timestamp: Date.now() }),
    };
  }

  const startTime = performance.now();
  return {
    end: () => {
      const duration = performance.now() - startTime;
      const metrics = { label, duration, timestamp: Date.now() };
      
      if (duration > config.monitoring.threshold.responseTime) {
        performanceEmitter.emit('threshold-exceeded', {
          type: 'responseTime',
          value: duration,
          threshold: config.monitoring.threshold.responseTime,
        });
      }
      
      return metrics;
    },
  };
};

export const withTiming = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  const result = await operation();
  const metrics = timing.end();
  return { result, metrics };
};

// Enhanced withTiming with Error Handling
export const withTimingAndErrorHandling = async <T>(
  operation: () => Promise<T>,
  label: string,
  errorConfig?: Partial<ErrorHandlerConfig>
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  try {
    const result = await withRetry(operation, errorConfig);
    const metrics = timing.end();
    return { result, metrics };
  } catch (error) {
    const metrics = timing.end();
    performanceEmitter.emit('error', { error, metrics });
    throw error;
  }
};

// Memory Monitoring
export const getMemoryUsage = (): number | undefined => {
  if (Platform.OS === 'web') {
    return performance?.memory?.usedJSHeapSize;
  }
  // For React Native, we could potentially add platform-specific implementations
  // using native modules for more accurate memory metrics
  return undefined;
};

// Enhanced Batch Operations
export const batchOperationsWithMetrics = async <T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: {
    batchSize?: number;
    label?: string;
    onBatchComplete?: (metrics: PerformanceMetrics) => void;
    errorConfig?: Partial<ErrorHandlerConfig>;
  } = {}
) => {
  const {
    batchSize = 5,
    label = 'batchOperation',
    onBatchComplete,
    errorConfig
  } = options;

  const totalMetrics: PerformanceMetrics[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const timing = measureTime(`${label}_batch_${i}`);
    
    try {
      await Promise.all(
        batch.map(item => 
          withRetry(() => operation(item), errorConfig)
        )
      );
      
      const metrics = timing.end();
      totalMetrics.push(metrics);
      onBatchComplete?.(metrics);
    } catch (error) {
      const metrics = timing.end();
      performanceEmitter.emit('batchError', { error, batchIndex: i, metrics });
      throw error;
    }
  }

  return totalMetrics;
};

// Performance Queue for Critical Operations
class PerformanceQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private errorConfig: Partial<ErrorHandlerConfig> = {
    retryAttempts: 2,
    timeoutMs: 10000,
    onError: (error) => {
      performanceEmitter.emit('queueError', error);
    }
  };

  setErrorConfig(config: Partial<ErrorHandlerConfig>) {
    this.errorConfig = { ...this.errorConfig, ...config };
  }

  async add(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    if (!this.isProcessing) {
      await this.process();
    }
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        const timing = measureTime('queuedOperation');
        try {
          await withRetry(operation, this.errorConfig);
        } catch (error) {
          performanceEmitter.emit('error', error);
        } finally {
          timing.end();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    this.isProcessing = false;
  }
}

export const performanceQueue = new PerformanceQueue();

// Keep existing utilities
export const deferredOperation = (operation: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    operation();
  });
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; executionTime: number }> => {
  const start = performance.now();
  const result = await operation();
  const executionTime = performance.now() - start;
  return { result, executionTime };
};

// Usage Example:
/*
performanceEmitter.on('timing', (metrics) => {
  console.log('Performance metrics:', metrics);
});

// Example usage of withTiming
const result = await withTiming(
  async () => {
    // Your async operation here
    return 'result';
  },
  'myOperation'
);

// Example usage of batchOperationsWithMetrics
const items = [1, 2, 3, 4, 5];
const metrics = await batchOperationsWithMetrics(
  items,
  async (item) => {
    // Process item
  },
  {
    batchSize: 2,
    label: 'itemProcessing',
    onBatchComplete: (metrics) => {
      console.log('Batch completed:', metrics);
    }
  }
);

// Example with Error Handling
try {
  const result = await withTimingAndErrorHandling(
    async () => {
      // Your operation here
      return 'result';
    },
    'criticalOperation',
    {
      retryAttempts: 3,
      timeoutMs: 5000,
      onError: (error) => {
        // Custom error handling
        console.error('Operation failed:', error);
      }
    }
  );
} catch (error) {
  // Handle final error
}

// Example with Error Boundary
const result = await createErrorBoundary(
  async () => {
    // Risky operation
    return await someAsyncOperation();
  },
  'fallback value',
  {
    retryAttempts: 2,
    timeoutMs: 3000
  }
);
*/

// Update Performance monitoring with configuration
export const initializePerformanceMonitoring = () => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled) return;

  // Initialize with configured values
  performanceEmitter.setMaxListeners(config.metrics.maxStorageSize);
  
  // Set up periodic flushing
  setInterval(() => {
    flushMetrics();
  }, config.metrics.flushIntervalMs);
};

// Update timing function to respect sampling rate
export const measureTime = (label: string) => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled || Math.random() > config.metrics.sampleRate) {
    // Return no-op version when disabled or not sampled
    return {
      end: () => ({ label, duration: 0, timestamp: Date.now() }),
    };
  }

  const startTime = performance.now();
  return {
    end: () => {
      const duration = performance.now() - startTime;
      const metrics = { label, duration, timestamp: Date.now() };
      
      if (duration > config.monitoring.threshold.responseTime) {
        performanceEmitter.emit('threshold-exceeded', {
          type: 'responseTime',
          value: duration,
          threshold: config.monitoring.threshold.responseTime,
        });
      }
      
      return metrics;
    },
  };
};

export const withTiming = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  const result = await operation();
  const metrics = timing.end();
  return { result, metrics };
};

// Enhanced withTiming with Error Handling
export const withTimingAndErrorHandling = async <T>(
  operation: () => Promise<T>,
  label: string,
  errorConfig?: Partial<ErrorHandlerConfig>
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  try {
    const result = await withRetry(operation, errorConfig);
    const metrics = timing.end();
    return { result, metrics };
  } catch (error) {
    const metrics = timing.end();
    performanceEmitter.emit('error', { error, metrics });
    throw error;
  }
};

// Memory Monitoring
export const getMemoryUsage = (): number | undefined => {
  if (Platform.OS === 'web') {
    return performance?.memory?.usedJSHeapSize;
  }
  // For React Native, we could potentially add platform-specific implementations
  // using native modules for more accurate memory metrics
  return undefined;
};

// Enhanced Batch Operations
export const batchOperationsWithMetrics = async <T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: {
    batchSize?: number;
    label?: string;
    onBatchComplete?: (metrics: PerformanceMetrics) => void;
    errorConfig?: Partial<ErrorHandlerConfig>;
  } = {}
) => {
  const {
    batchSize = 5,
    label = 'batchOperation',
    onBatchComplete,
    errorConfig
  } = options;

  const totalMetrics: PerformanceMetrics[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const timing = measureTime(`${label}_batch_${i}`);
    
    try {
      await Promise.all(
        batch.map(item => 
          withRetry(() => operation(item), errorConfig)
        )
      );
      
      const metrics = timing.end();
      totalMetrics.push(metrics);
      onBatchComplete?.(metrics);
    } catch (error) {
      const metrics = timing.end();
      performanceEmitter.emit('batchError', { error, batchIndex: i, metrics });
      throw error;
    }
  }

  return totalMetrics;
};

// Performance Queue for Critical Operations
class PerformanceQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private errorConfig: Partial<ErrorHandlerConfig> = {
    retryAttempts: 2,
    timeoutMs: 10000,
    onError: (error) => {
      performanceEmitter.emit('queueError', error);
    }
  };

  setErrorConfig(config: Partial<ErrorHandlerConfig>) {
    this.errorConfig = { ...this.errorConfig, ...config };
  }

  async add(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    if (!this.isProcessing) {
      await this.process();
    }
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        const timing = measureTime('queuedOperation');
        try {
          await withRetry(operation, this.errorConfig);
        } catch (error) {
          performanceEmitter.emit('error', error);
        } finally {
          timing.end();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    this.isProcessing = false;
  }
}

export const performanceQueue = new PerformanceQueue();

// Keep existing utilities
export const deferredOperation = (operation: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    operation();
  });
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; executionTime: number }> => {
  const start = performance.now();
  const result = await operation();
  const executionTime = performance.now() - start;
  return { result, executionTime };
};

// Usage Example:
/*
performanceEmitter.on('timing', (metrics) => {
  console.log('Performance metrics:', metrics);
});

// Example usage of withTiming
const result = await withTiming(
  async () => {
    // Your async operation here
    return 'result';
  },
  'myOperation'
);

// Example usage of batchOperationsWithMetrics
const items = [1, 2, 3, 4, 5];
const metrics = await batchOperationsWithMetrics(
  items,
  async (item) => {
    // Process item
  },
  {
    batchSize: 2,
    label: 'itemProcessing',
    onBatchComplete: (metrics) => {
      console.log('Batch completed:', metrics);
    }
  }
);

// Example with Error Handling
try {
  const result = await withTimingAndErrorHandling(
    async () => {
      // Your operation here
      return 'result';
    },
    'criticalOperation',
    {
      retryAttempts: 3,
      timeoutMs: 5000,
      onError: (error) => {
        // Custom error handling
        console.error('Operation failed:', error);
      }
    }
  );
} catch (error) {
  // Handle final error
}

// Example with Error Boundary
const result = await createErrorBoundary(
  async () => {
    // Risky operation
    return await someAsyncOperation();
  },
  'fallback value',
  {
    retryAttempts: 2,
    timeoutMs: 3000
  }
);
*/

// Update Performance monitoring with configuration
export const initializePerformanceMonitoring = () => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled) return;

  // Initialize with configured values
  performanceEmitter.setMaxListeners(config.metrics.maxStorageSize);
  
  // Set up periodic flushing
  setInterval(() => {
    flushMetrics();
  }, config.metrics.flushIntervalMs);
};

// Update timing function to respect sampling rate
export const measureTime = (label: string) => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled || Math.random() > config.metrics.sampleRate) {
    // Return no-op version when disabled or not sampled
    return {
      end: () => ({ label, duration: 0, timestamp: Date.now() }),
    };
  }

  const startTime = performance.now();
  return {
    end: () => {
      const duration = performance.now() - startTime;
      const metrics = { label, duration, timestamp: Date.now() };
      
      if (duration > config.monitoring.threshold.responseTime) {
        performanceEmitter.emit('threshold-exceeded', {
          type: 'responseTime',
          value: duration,
          threshold: config.monitoring.threshold.responseTime,
        });
      }
      
      return metrics;
    },
  };
};

export const withTiming = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  const result = await operation();
  const metrics = timing.end();
  return { result, metrics };
};

// Enhanced withTiming with Error Handling
export const withTimingAndErrorHandling = async <T>(
  operation: () => Promise<T>,
  label: string,
  errorConfig?: Partial<ErrorHandlerConfig>
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  try {
    const result = await withRetry(operation, errorConfig);
    const metrics = timing.end();
    return { result, metrics };
  } catch (error) {
    const metrics = timing.end();
    performanceEmitter.emit('error', { error, metrics });
    throw error;
  }
};

// Memory Monitoring
export const getMemoryUsage = (): number | undefined => {
  if (Platform.OS === 'web') {
    return performance?.memory?.usedJSHeapSize;
  }
  // For React Native, we could potentially add platform-specific implementations
  // using native modules for more accurate memory metrics
  return undefined;
};

// Enhanced Batch Operations
export const batchOperationsWithMetrics = async <T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: {
    batchSize?: number;
    label?: string;
    onBatchComplete?: (metrics: PerformanceMetrics) => void;
    errorConfig?: Partial<ErrorHandlerConfig>;
  } = {}
) => {
  const {
    batchSize = 5,
    label = 'batchOperation',
    onBatchComplete,
    errorConfig
  } = options;

  const totalMetrics: PerformanceMetrics[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const timing = measureTime(`${label}_batch_${i}`);
    
    try {
      await Promise.all(
        batch.map(item => 
          withRetry(() => operation(item), errorConfig)
        )
      );
      
      const metrics = timing.end();
      totalMetrics.push(metrics);
      onBatchComplete?.(metrics);
    } catch (error) {
      const metrics = timing.end();
      performanceEmitter.emit('batchError', { error, batchIndex: i, metrics });
      throw error;
    }
  }

  return totalMetrics;
};

// Performance Queue for Critical Operations
class PerformanceQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private errorConfig: Partial<ErrorHandlerConfig> = {
    retryAttempts: 2,
    timeoutMs: 10000,
    onError: (error) => {
      performanceEmitter.emit('queueError', error);
    }
  };

  setErrorConfig(config: Partial<ErrorHandlerConfig>) {
    this.errorConfig = { ...this.errorConfig, ...config };
  }

  async add(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    if (!this.isProcessing) {
      await this.process();
    }
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        const timing = measureTime('queuedOperation');
        try {
          await withRetry(operation, this.errorConfig);
        } catch (error) {
          performanceEmitter.emit('error', error);
        } finally {
          timing.end();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    this.isProcessing = false;
  }
}

export const performanceQueue = new PerformanceQueue();

// Keep existing utilities
export const deferredOperation = (operation: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    operation();
  });
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; executionTime: number }> => {
  const start = performance.now();
  const result = await operation();
  const executionTime = performance.now() - start;
  return { result, executionTime };
};

// Usage Example:
/*
performanceEmitter.on('timing', (metrics) => {
  console.log('Performance metrics:', metrics);
});

// Example usage of withTiming
const result = await withTiming(
  async () => {
    // Your async operation here
    return 'result';
  },
  'myOperation'
);

// Example usage of batchOperationsWithMetrics
const items = [1, 2, 3, 4, 5];
const metrics = await batchOperationsWithMetrics(
  items,
  async (item) => {
    // Process item
  },
  {
    batchSize: 2,
    label: 'itemProcessing',
    onBatchComplete: (metrics) => {
      console.log('Batch completed:', metrics);
    }
  }
);

// Example with Error Handling
try {
  const result = await withTimingAndErrorHandling(
    async () => {
      // Your operation here
      return 'result';
    },
    'criticalOperation',
    {
      retryAttempts: 3,
      timeoutMs: 5000,
      onError: (error) => {
        // Custom error handling
        console.error('Operation failed:', error);
      }
    }
  );
} catch (error) {
  // Handle final error
}

// Example with Error Boundary
const result = await createErrorBoundary(
  async () => {
    // Risky operation
    return await someAsyncOperation();
  },
  'fallback value',
  {
    retryAttempts: 2,
    timeoutMs: 3000
  }
);
*/

// Update Performance monitoring with configuration
export const initializePerformanceMonitoring = () => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled) return;

  // Initialize with configured values
  performanceEmitter.setMaxListeners(config.metrics.maxStorageSize);
  
  // Set up periodic flushing
  setInterval(() => {
    flushMetrics();
  }, config.metrics.flushIntervalMs);
};

// Update timing function to respect sampling rate
export const measureTime = (label: string) => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled || Math.random() > config.metrics.sampleRate) {
    // Return no-op version when disabled or not sampled
    return {
      end: () => ({ label, duration: 0, timestamp: Date.now() }),
    };
  }

  const startTime = performance.now();
  return {
    end: () => {
      const duration = performance.now() - startTime;
      const metrics = { label, duration, timestamp: Date.now() };
      
      if (duration > config.monitoring.threshold.responseTime) {
        performanceEmitter.emit('threshold-exceeded', {
          type: 'responseTime',
          value: duration,
          threshold: config.monitoring.threshold.responseTime,
        });
      }
      
      return metrics;
    },
  };
};

export const withTiming = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  const result = await operation();
  const metrics = timing.end();
  return { result, metrics };
};

// Enhanced withTiming with Error Handling
export const withTimingAndErrorHandling = async <T>(
  operation: () => Promise<T>,
  label: string,
  errorConfig?: Partial<ErrorHandlerConfig>
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  try {
    const result = await withRetry(operation, errorConfig);
    const metrics = timing.end();
    return { result, metrics };
  } catch (error) {
    const metrics = timing.end();
    performanceEmitter.emit('error', { error, metrics });
    throw error;
  }
};

// Memory Monitoring
export const getMemoryUsage = (): number | undefined => {
  if (Platform.OS === 'web') {
    return performance?.memory?.usedJSHeapSize;
  }
  // For React Native, we could potentially add platform-specific implementations
  // using native modules for more accurate memory metrics
  return undefined;
};

// Enhanced Batch Operations
export const batchOperationsWithMetrics = async <T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: {
    batchSize?: number;
    label?: string;
    onBatchComplete?: (metrics: PerformanceMetrics) => void;
    errorConfig?: Partial<ErrorHandlerConfig>;
  } = {}
) => {
  const {
    batchSize = 5,
    label = 'batchOperation',
    onBatchComplete,
    errorConfig
  } = options;

  const totalMetrics: PerformanceMetrics[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const timing = measureTime(`${label}_batch_${i}`);
    
    try {
      await Promise.all(
        batch.map(item => 
          withRetry(() => operation(item), errorConfig)
        )
      );
      
      const metrics = timing.end();
      totalMetrics.push(metrics);
      onBatchComplete?.(metrics);
    } catch (error) {
      const metrics = timing.end();
      performanceEmitter.emit('batchError', { error, batchIndex: i, metrics });
      throw error;
    }
  }

  return totalMetrics;
};

// Performance Queue for Critical Operations
class PerformanceQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private errorConfig: Partial<ErrorHandlerConfig> = {
    retryAttempts: 2,
    timeoutMs: 10000,
    onError: (error) => {
      performanceEmitter.emit('queueError', error);
    }
  };

  setErrorConfig(config: Partial<ErrorHandlerConfig>) {
    this.errorConfig = { ...this.errorConfig, ...config };
  }

  async add(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    if (!this.isProcessing) {
      await this.process();
    }
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        const timing = measureTime('queuedOperation');
        try {
          await withRetry(operation, this.errorConfig);
        } catch (error) {
          performanceEmitter.emit('error', error);
        } finally {
          timing.end();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    this.isProcessing = false;
  }
}

export const performanceQueue = new PerformanceQueue();

// Keep existing utilities
export const deferredOperation = (operation: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    operation();
  });
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; executionTime: number }> => {
  const start = performance.now();
  const result = await operation();
  const executionTime = performance.now() - start;
  return { result, executionTime };
};

// Usage Example:
/*
performanceEmitter.on('timing', (metrics) => {
  console.log('Performance metrics:', metrics);
});

// Example usage of withTiming
const result = await withTiming(
  async () => {
    // Your async operation here
    return 'result';
  },
  'myOperation'
);

// Example usage of batchOperationsWithMetrics
const items = [1, 2, 3, 4, 5];
const metrics = await batchOperationsWithMetrics(
  items,
  async (item) => {
    // Process item
  },
  {
    batchSize: 2,
    label: 'itemProcessing',
    onBatchComplete: (metrics) => {
      console.log('Batch completed:', metrics);
    }
  }
);

// Example with Error Handling
try {
  const result = await withTimingAndErrorHandling(
    async () => {
      // Your operation here
      return 'result';
    },
    'criticalOperation',
    {
      retryAttempts: 3,
      timeoutMs: 5000,
      onError: (error) => {
        // Custom error handling
        console.error('Operation failed:', error);
      }
    }
  );
} catch (error) {
  // Handle final error
}

// Example with Error Boundary
const result = await createErrorBoundary(
  async () => {
    // Risky operation
    return await someAsyncOperation();
  },
  'fallback value',
  {
    retryAttempts: 2,
    timeoutMs: 3000
  }
);
*/

// Update Performance monitoring with configuration
export const initializePerformanceMonitoring = () => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled) return;

  // Initialize with configured values
  performanceEmitter.setMaxListeners(config.metrics.maxStorageSize);
  
  // Set up periodic flushing
  setInterval(() => {
    flushMetrics();
  }, config.metrics.flushIntervalMs);
};

// Update timing function to respect sampling rate
export const measureTime = (label: string) => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled || Math.random() > config.metrics.sampleRate) {
    // Return no-op version when disabled or not sampled
    return {
      end: () => ({ label, duration: 0, timestamp: Date.now() }),
    };
  }

  const startTime = performance.now();
  return {
    end: () => {
      const duration = performance.now() - startTime;
      const metrics = { label, duration, timestamp: Date.now() };
      
      if (duration > config.monitoring.threshold.responseTime) {
        performanceEmitter.emit('threshold-exceeded', {
          type: 'responseTime',
          value: duration,
          threshold: config.monitoring.threshold.responseTime,
        });
      }
      
      return metrics;
    },
  };
};

export const withTiming = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  const result = await operation();
  const metrics = timing.end();
  return { result, metrics };
};

// Enhanced withTiming with Error Handling
export const withTimingAndErrorHandling = async <T>(
  operation: () => Promise<T>,
  label: string,
  errorConfig?: Partial<ErrorHandlerConfig>
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  try {
    const result = await withRetry(operation, errorConfig);
    const metrics = timing.end();
    return { result, metrics };
  } catch (error) {
    const metrics = timing.end();
    performanceEmitter.emit('error', { error, metrics });
    throw error;
  }
};

// Memory Monitoring
export const getMemoryUsage = (): number | undefined => {
  if (Platform.OS === 'web') {
    return performance?.memory?.usedJSHeapSize;
  }
  // For React Native, we could potentially add platform-specific implementations
  // using native modules for more accurate memory metrics
  return undefined;
};

// Enhanced Batch Operations
export const batchOperationsWithMetrics = async <T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: {
    batchSize?: number;
    label?: string;
    onBatchComplete?: (metrics: PerformanceMetrics) => void;
    errorConfig?: Partial<ErrorHandlerConfig>;
  } = {}
) => {
  const {
    batchSize = 5,
    label = 'batchOperation',
    onBatchComplete,
    errorConfig
  } = options;

  const totalMetrics: PerformanceMetrics[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const timing = measureTime(`${label}_batch_${i}`);
    
    try {
      await Promise.all(
        batch.map(item => 
          withRetry(() => operation(item), errorConfig)
        )
      );
      
      const metrics = timing.end();
      totalMetrics.push(metrics);
      onBatchComplete?.(metrics);
    } catch (error) {
      const metrics = timing.end();
      performanceEmitter.emit('batchError', { error, batchIndex: i, metrics });
      throw error;
    }
  }

  return totalMetrics;
};

// Performance Queue for Critical Operations
class PerformanceQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private errorConfig: Partial<ErrorHandlerConfig> = {
    retryAttempts: 2,
    timeoutMs: 10000,
    onError: (error) => {
      performanceEmitter.emit('queueError', error);
    }
  };

  setErrorConfig(config: Partial<ErrorHandlerConfig>) {
    this.errorConfig = { ...this.errorConfig, ...config };
  }

  async add(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    if (!this.isProcessing) {
      await this.process();
    }
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        const timing = measureTime('queuedOperation');
        try {
          await withRetry(operation, this.errorConfig);
        } catch (error) {
          performanceEmitter.emit('error', error);
        } finally {
          timing.end();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    this.isProcessing = false;
  }
}

export const performanceQueue = new PerformanceQueue();

// Keep existing utilities
export const deferredOperation = (operation: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    operation();
  });
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; executionTime: number }> => {
  const start = performance.now();
  const result = await operation();
  const executionTime = performance.now() - start;
  return { result, executionTime };
};

// Usage Example:
/*
performanceEmitter.on('timing', (metrics) => {
  console.log('Performance metrics:', metrics);
});

// Example usage of withTiming
const result = await withTiming(
  async () => {
    // Your async operation here
    return 'result';
  },
  'myOperation'
);

// Example usage of batchOperationsWithMetrics
const items = [1, 2, 3, 4, 5];
const metrics = await batchOperationsWithMetrics(
  items,
  async (item) => {
    // Process item
  },
  {
    batchSize: 2,
    label: 'itemProcessing',
    onBatchComplete: (metrics) => {
      console.log('Batch completed:', metrics);
    }
  }
);

// Example with Error Handling
try {
  const result = await withTimingAndErrorHandling(
    async () => {
      // Your operation here
      return 'result';
    },
    'criticalOperation',
    {
      retryAttempts: 3,
      timeoutMs: 5000,
      onError: (error) => {
        // Custom error handling
        console.error('Operation failed:', error);
      }
    }
  );
} catch (error) {
  // Handle final error
}

// Example with Error Boundary
const result = await createErrorBoundary(
  async () => {
    // Risky operation
    return await someAsyncOperation();
  },
  'fallback value',
  {
    retryAttempts: 2,
    timeoutMs: 3000
  }
);
*/

// Update Performance monitoring with configuration
export const initializePerformanceMonitoring = () => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled) return;

  // Initialize with configured values
  performanceEmitter.setMaxListeners(config.metrics.maxStorageSize);
  
  // Set up periodic flushing
  setInterval(() => {
    flushMetrics();
  }, config.metrics.flushIntervalMs);
};

// Update timing function to respect sampling rate
export const measureTime = (label: string) => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled || Math.random() > config.metrics.sampleRate) {
    // Return no-op version when disabled or not sampled
    return {
      end: () => ({ label, duration: 0, timestamp: Date.now() }),
    };
  }

  const startTime = performance.now();
  return {
    end: () => {
      const duration = performance.now() - startTime;
      const metrics = { label, duration, timestamp: Date.now() };
      
      if (duration > config.monitoring.threshold.responseTime) {
        performanceEmitter.emit('threshold-exceeded', {
          type: 'responseTime',
          value: duration,
          threshold: config.monitoring.threshold.responseTime,
        });
      }
      
      return metrics;
    },
  };
};

export const withTiming = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  const result = await operation();
  const metrics = timing.end();
  return { result, metrics };
};

// Enhanced withTiming with Error Handling
export const withTimingAndErrorHandling = async <T>(
  operation: () => Promise<T>,
  label: string,
  errorConfig?: Partial<ErrorHandlerConfig>
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  try {
    const result = await withRetry(operation, errorConfig);
    const metrics = timing.end();
    return { result, metrics };
  } catch (error) {
    const metrics = timing.end();
    performanceEmitter.emit('error', { error, metrics });
    throw error;
  }
};

// Memory Monitoring
export const getMemoryUsage = (): number | undefined => {
  if (Platform.OS === 'web') {
    return performance?.memory?.usedJSHeapSize;
  }
  // For React Native, we could potentially add platform-specific implementations
  // using native modules for more accurate memory metrics
  return undefined;
};

// Enhanced Batch Operations
export const batchOperationsWithMetrics = async <T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: {
    batchSize?: number;
    label?: string;
    onBatchComplete?: (metrics: PerformanceMetrics) => void;
    errorConfig?: Partial<ErrorHandlerConfig>;
  } = {}
) => {
  const {
    batchSize = 5,
    label = 'batchOperation',
    onBatchComplete,
    errorConfig
  } = options;

  const totalMetrics: PerformanceMetrics[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const timing = measureTime(`${label}_batch_${i}`);
    
    try {
      await Promise.all(
        batch.map(item => 
          withRetry(() => operation(item), errorConfig)
        )
      );
      
      const metrics = timing.end();
      totalMetrics.push(metrics);
      onBatchComplete?.(metrics);
    } catch (error) {
      const metrics = timing.end();
      performanceEmitter.emit('batchError', { error, batchIndex: i, metrics });
      throw error;
    }
  }

  return totalMetrics;
};

// Performance Queue for Critical Operations
class PerformanceQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private errorConfig: Partial<ErrorHandlerConfig> = {
    retryAttempts: 2,
    timeoutMs: 10000,
    onError: (error) => {
      performanceEmitter.emit('queueError', error);
    }
  };

  setErrorConfig(config: Partial<ErrorHandlerConfig>) {
    this.errorConfig = { ...this.errorConfig, ...config };
  }

  async add(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    if (!this.isProcessing) {
      await this.process();
    }
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        const timing = measureTime('queuedOperation');
        try {
          await withRetry(operation, this.errorConfig);
        } catch (error) {
          performanceEmitter.emit('error', error);
        } finally {
          timing.end();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    this.isProcessing = false;
  }
}

export const performanceQueue = new PerformanceQueue();

// Keep existing utilities
export const deferredOperation = (operation: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    operation();
  });
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; executionTime: number }> => {
  const start = performance.now();
  const result = await operation();
  const executionTime = performance.now() - start;
  return { result, executionTime };
};

// Usage Example:
/*
performanceEmitter.on('timing', (metrics) => {
  console.log('Performance metrics:', metrics);
});

// Example usage of withTiming
const result = await withTiming(
  async () => {
    // Your async operation here
    return 'result';
  },
  'myOperation'
);

// Example usage of batchOperationsWithMetrics
const items = [1, 2, 3, 4, 5];
const metrics = await batchOperationsWithMetrics(
  items,
  async (item) => {
    // Process item
  },
  {
    batchSize: 2,
    label: 'itemProcessing',
    onBatchComplete: (metrics) => {
      console.log('Batch completed:', metrics);
    }
  }
);

// Example with Error Handling
try {
  const result = await withTimingAndErrorHandling(
    async () => {
      // Your operation here
      return 'result';
    },
    'criticalOperation',
    {
      retryAttempts: 3,
      timeoutMs: 5000,
      onError: (error) => {
        // Custom error handling
        console.error('Operation failed:', error);
      }
    }
  );
} catch (error) {
  // Handle final error
}

// Example with Error Boundary
const result = await createErrorBoundary(
  async () => {
    // Risky operation
    return await someAsyncOperation();
  },
  'fallback value',
  {
    retryAttempts: 2,
    timeoutMs: 3000
  }
);
*/

// Update Performance monitoring with configuration
export const initializePerformanceMonitoring = () => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled) return;

  // Initialize with configured values
  performanceEmitter.setMaxListeners(config.metrics.maxStorageSize);
  
  // Set up periodic flushing
  setInterval(() => {
    flushMetrics();
  }, config.metrics.flushIntervalMs);
};

// Update timing function to respect sampling rate
export const measureTime = (label: string) => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled || Math.random() > config.metrics.sampleRate) {
    // Return no-op version when disabled or not sampled
    return {
      end: () => ({ label, duration: 0, timestamp: Date.now() }),
    };
  }

  const startTime = performance.now();
  return {
    end: () => {
      const duration = performance.now() - startTime;
      const metrics = { label, duration, timestamp: Date.now() };
      
      if (duration > config.monitoring.threshold.responseTime) {
        performanceEmitter.emit('threshold-exceeded', {
          type: 'responseTime',
          value: duration,
          threshold: config.monitoring.threshold.responseTime,
        });
      }
      
      return metrics;
    },
  };
};

export const withTiming = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  const result = await operation();
  const metrics = timing.end();
  return { result, metrics };
};

// Enhanced withTiming with Error Handling
export const withTimingAndErrorHandling = async <T>(
  operation: () => Promise<T>,
  label: string,
  errorConfig?: Partial<ErrorHandlerConfig>
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  try {
    const result = await withRetry(operation, errorConfig);
    const metrics = timing.end();
    return { result, metrics };
  } catch (error) {
    const metrics = timing.end();
    performanceEmitter.emit('error', { error, metrics });
    throw error;
  }
};

// Memory Monitoring
export const getMemoryUsage = (): number | undefined => {
  if (Platform.OS === 'web') {
    return performance?.memory?.usedJSHeapSize;
  }
  // For React Native, we could potentially add platform-specific implementations
  // using native modules for more accurate memory metrics
  return undefined;
};

// Enhanced Batch Operations
export const batchOperationsWithMetrics = async <T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: {
    batchSize?: number;
    label?: string;
    onBatchComplete?: (metrics: PerformanceMetrics) => void;
    errorConfig?: Partial<ErrorHandlerConfig>;
  } = {}
) => {
  const {
    batchSize = 5,
    label = 'batchOperation',
    onBatchComplete,
    errorConfig
  } = options;

  const totalMetrics: PerformanceMetrics[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const timing = measureTime(`${label}_batch_${i}`);
    
    try {
      await Promise.all(
        batch.map(item => 
          withRetry(() => operation(item), errorConfig)
        )
      );
      
      const metrics = timing.end();
      totalMetrics.push(metrics);
      onBatchComplete?.(metrics);
    } catch (error) {
      const metrics = timing.end();
      performanceEmitter.emit('batchError', { error, batchIndex: i, metrics });
      throw error;
    }
  }

  return totalMetrics;
};

// Performance Queue for Critical Operations
class PerformanceQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private errorConfig: Partial<ErrorHandlerConfig> = {
    retryAttempts: 2,
    timeoutMs: 10000,
    onError: (error) => {
      performanceEmitter.emit('queueError', error);
    }
  };

  setErrorConfig(config: Partial<ErrorHandlerConfig>) {
    this.errorConfig = { ...this.errorConfig, ...config };
  }

  async add(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    if (!this.isProcessing) {
      await this.process();
    }
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        const timing = measureTime('queuedOperation');
        try {
          await withRetry(operation, this.errorConfig);
        } catch (error) {
          performanceEmitter.emit('error', error);
        } finally {
          timing.end();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    this.isProcessing = false;
  }
}

export const performanceQueue = new PerformanceQueue();

// Keep existing utilities
export const deferredOperation = (operation: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    operation();
  });
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; executionTime: number }> => {
  const start = performance.now();
  const result = await operation();
  const executionTime = performance.now() - start;
  return { result, executionTime };
};

// Usage Example:
/*
performanceEmitter.on('timing', (metrics) => {
  console.log('Performance metrics:', metrics);
});

// Example usage of withTiming
const result = await withTiming(
  async () => {
    // Your async operation here
    return 'result';
  },
  'myOperation'
);

// Example usage of batchOperationsWithMetrics
const items = [1, 2, 3, 4, 5];
const metrics = await batchOperationsWithMetrics(
  items,
  async (item) => {
    // Process item
  },
  {
    batchSize: 2,
    label: 'itemProcessing',
    onBatchComplete: (metrics) => {
      console.log('Batch completed:', metrics);
    }
  }
);

// Example with Error Handling
try {
  const result = await withTimingAndErrorHandling(
    async () => {
      // Your operation here
      return 'result';
    },
    'criticalOperation',
    {
      retryAttempts: 3,
      timeoutMs: 5000,
      onError: (error) => {
        // Custom error handling
        console.error('Operation failed:', error);
      }
    }
  );
} catch (error) {
  // Handle final error
}

// Example with Error Boundary
const result = await createErrorBoundary(
  async () => {
    // Risky operation
    return await someAsyncOperation();
  },
  'fallback value',
  {
    retryAttempts: 2,
    timeoutMs: 3000
  }
);
*/

// Update Performance monitoring with configuration
export const initializePerformanceMonitoring = () => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled) return;

  // Initialize with configured values
  performanceEmitter.setMaxListeners(config.metrics.maxStorageSize);
  
  // Set up periodic flushing
  setInterval(() => {
    flushMetrics();
  }, config.metrics.flushIntervalMs);
};

// Update timing function to respect sampling rate
export const measureTime = (label: string) => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled || Math.random() > config.metrics.sampleRate) {
    // Return no-op version when disabled or not sampled
    return {
      end: () => ({ label, duration: 0, timestamp: Date.now() }),
    };
  }

  const startTime = performance.now();
  return {
    end: () => {
      const duration = performance.now() - startTime;
      const metrics = { label, duration, timestamp: Date.now() };
      
      if (duration > config.monitoring.threshold.responseTime) {
        performanceEmitter.emit('threshold-exceeded', {
          type: 'responseTime',
          value: duration,
          threshold: config.monitoring.threshold.responseTime,
        });
      }
      
      return metrics;
    },
  };
};

export const withTiming = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  const result = await operation();
  const metrics = timing.end();
  return { result, metrics };
};

// Enhanced withTiming with Error Handling
export const withTimingAndErrorHandling = async <T>(
  operation: () => Promise<T>,
  label: string,
  errorConfig?: Partial<ErrorHandlerConfig>
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  try {
    const result = await withRetry(operation, errorConfig);
    const metrics = timing.end();
    return { result, metrics };
  } catch (error) {
    const metrics = timing.end();
    performanceEmitter.emit('error', { error, metrics });
    throw error;
  }
};

// Memory Monitoring
export const getMemoryUsage = (): number | undefined => {
  if (Platform.OS === 'web') {
    return performance?.memory?.usedJSHeapSize;
  }
  // For React Native, we could potentially add platform-specific implementations
  // using native modules for more accurate memory metrics
  return undefined;
};

// Enhanced Batch Operations
export const batchOperationsWithMetrics = async <T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: {
    batchSize?: number;
    label?: string;
    onBatchComplete?: (metrics: PerformanceMetrics) => void;
    errorConfig?: Partial<ErrorHandlerConfig>;
  } = {}
) => {
  const {
    batchSize = 5,
    label = 'batchOperation',
    onBatchComplete,
    errorConfig
  } = options;

  const totalMetrics: PerformanceMetrics[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const timing = measureTime(`${label}_batch_${i}`);
    
    try {
      await Promise.all(
        batch.map(item => 
          withRetry(() => operation(item), errorConfig)
        )
      );
      
      const metrics = timing.end();
      totalMetrics.push(metrics);
      onBatchComplete?.(metrics);
    } catch (error) {
      const metrics = timing.end();
      performanceEmitter.emit('batchError', { error, batchIndex: i, metrics });
      throw error;
    }
  }

  return totalMetrics;
};

// Performance Queue for Critical Operations
class PerformanceQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private errorConfig: Partial<ErrorHandlerConfig> = {
    retryAttempts: 2,
    timeoutMs: 10000,
    onError: (error) => {
      performanceEmitter.emit('queueError', error);
    }
  };

  setErrorConfig(config: Partial<ErrorHandlerConfig>) {
    this.errorConfig = { ...this.errorConfig, ...config };
  }

  async add(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    if (!this.isProcessing) {
      await this.process();
    }
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        const timing = measureTime('queuedOperation');
        try {
          await withRetry(operation, this.errorConfig);
        } catch (error) {
          performanceEmitter.emit('error', error);
        } finally {
          timing.end();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    this.isProcessing = false;
  }
}

export const performanceQueue = new PerformanceQueue();

// Keep existing utilities
export const deferredOperation = (operation: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    operation();
  });
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; executionTime: number }> => {
  const start = performance.now();
  const result = await operation();
  const executionTime = performance.now() - start;
  return { result, executionTime };
};

// Usage Example:
/*
performanceEmitter.on('timing', (metrics) => {
  console.log('Performance metrics:', metrics);
});

// Example usage of withTiming
const result = await withTiming(
  async () => {
    // Your async operation here
    return 'result';
  },
  'myOperation'
);

// Example usage of batchOperationsWithMetrics
const items = [1, 2, 3, 4, 5];
const metrics = await batchOperationsWithMetrics(
  items,
  async (item) => {
    // Process item
  },
  {
    batchSize: 2,
    label: 'itemProcessing',
    onBatchComplete: (metrics) => {
      console.log('Batch completed:', metrics);
    }
  }
);

// Example with Error Handling
try {
  const result = await withTimingAndErrorHandling(
    async () => {
      // Your operation here
      return 'result';
    },
    'criticalOperation',
    {
      retryAttempts: 3,
      timeoutMs: 5000,
      onError: (error) => {
        // Custom error handling
        console.error('Operation failed:', error);
      }
    }
  );
} catch (error) {
  // Handle final error
}

// Example with Error Boundary
const result = await createErrorBoundary(
  async () => {
    // Risky operation
    return await someAsyncOperation();
  },
  'fallback value',
  {
    retryAttempts: 2,
    timeoutMs: 3000
  }
);
*/

// Update Performance monitoring with configuration
export const initializePerformanceMonitoring = () => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled) return;

  // Initialize with configured values
  performanceEmitter.setMaxListeners(config.metrics.maxStorageSize);
  
  // Set up periodic flushing
  setInterval(() => {
    flushMetrics();
  }, config.metrics.flushIntervalMs);
};

// Update timing function to respect sampling rate
export const measureTime = (label: string) => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled || Math.random() > config.metrics.sampleRate) {
    // Return no-op version when disabled or not sampled
    return {
      end: () => ({ label, duration: 0, timestamp: Date.now() }),
    };
  }

  const startTime = performance.now();
  return {
    end: () => {
      const duration = performance.now() - startTime;
      const metrics = { label, duration, timestamp: Date.now() };
      
      if (duration > config.monitoring.threshold.responseTime) {
        performanceEmitter.emit('threshold-exceeded', {
          type: 'responseTime',
          value: duration,
          threshold: config.monitoring.threshold.responseTime,
        });
      }
      
      return metrics;
    },
  };
};

export const withTiming = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  const result = await operation();
  const metrics = timing.end();
  return { result, metrics };
};

// Enhanced withTiming with Error Handling
export const withTimingAndErrorHandling = async <T>(
  operation: () => Promise<T>,
  label: string,
  errorConfig?: Partial<ErrorHandlerConfig>
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  try {
    const result = await withRetry(operation, errorConfig);
    const metrics = timing.end();
    return { result, metrics };
  } catch (error) {
    const metrics = timing.end();
    performanceEmitter.emit('error', { error, metrics });
    throw error;
  }
};

// Memory Monitoring
export const getMemoryUsage = (): number | undefined => {
  if (Platform.OS === 'web') {
    return performance?.memory?.usedJSHeapSize;
  }
  // For React Native, we could potentially add platform-specific implementations
  // using native modules for more accurate memory metrics
  return undefined;
};

// Enhanced Batch Operations
export const batchOperationsWithMetrics = async <T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: {
    batchSize?: number;
    label?: string;
    onBatchComplete?: (metrics: PerformanceMetrics) => void;
    errorConfig?: Partial<ErrorHandlerConfig>;
  } = {}
) => {
  const {
    batchSize = 5,
    label = 'batchOperation',
    onBatchComplete,
    errorConfig
  } = options;

  const totalMetrics: PerformanceMetrics[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const timing = measureTime(`${label}_batch_${i}`);
    
    try {
      await Promise.all(
        batch.map(item => 
          withRetry(() => operation(item), errorConfig)
        )
      );
      
      const metrics = timing.end();
      totalMetrics.push(metrics);
      onBatchComplete?.(metrics);
    } catch (error) {
      const metrics = timing.end();
      performanceEmitter.emit('batchError', { error, batchIndex: i, metrics });
      throw error;
    }
  }

  return totalMetrics;
};

// Performance Queue for Critical Operations
class PerformanceQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private errorConfig: Partial<ErrorHandlerConfig> = {
    retryAttempts: 2,
    timeoutMs: 10000,
    onError: (error) => {
      performanceEmitter.emit('queueError', error);
    }
  };

  setErrorConfig(config: Partial<ErrorHandlerConfig>) {
    this.errorConfig = { ...this.errorConfig, ...config };
  }

  async add(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    if (!this.isProcessing) {
      await this.process();
    }
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        const timing = measureTime('queuedOperation');
        try {
          await withRetry(operation, this.errorConfig);
        } catch (error) {
          performanceEmitter.emit('error', error);
        } finally {
          timing.end();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    this.isProcessing = false;
  }
}

export const performanceQueue = new PerformanceQueue();

// Keep existing utilities
export const deferredOperation = (operation: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    operation();
  });
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; executionTime: number }> => {
  const start = performance.now();
  const result = await operation();
  const executionTime = performance.now() - start;
  return { result, executionTime };
};

// Usage Example:
/*
performanceEmitter.on('timing', (metrics) => {
  console.log('Performance metrics:', metrics);
});

// Example usage of withTiming
const result = await withTiming(
  async () => {
    // Your async operation here
    return 'result';
  },
  'myOperation'
);

// Example usage of batchOperationsWithMetrics
const items = [1, 2, 3, 4, 5];
const metrics = await batchOperationsWithMetrics(
  items,
  async (item) => {
    // Process item
  },
  {
    batchSize: 2,
    label: 'itemProcessing',
    onBatchComplete: (metrics) => {
      console.log('Batch completed:', metrics);
    }
  }
);

// Example with Error Handling
try {
  const result = await withTimingAndErrorHandling(
    async () => {
      // Your operation here
      return 'result';
    },
    'criticalOperation',
    {
      retryAttempts: 3,
      timeoutMs: 5000,
      onError: (error) => {
        // Custom error handling
        console.error('Operation failed:', error);
      }
    }
  );
} catch (error) {
  // Handle final error
}

// Example with Error Boundary
const result = await createErrorBoundary(
  async () => {
    // Risky operation
    return await someAsyncOperation();
  },
  'fallback value',
  {
    retryAttempts: 2,
    timeoutMs: 3000
  }
);
*/

// Update Performance monitoring with configuration
export const initializePerformanceMonitoring = () => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled) return;

  // Initialize with configured values
  performanceEmitter.setMaxListeners(config.metrics.maxStorageSize);
  
  // Set up periodic flushing
  setInterval(() => {
    flushMetrics();
  }, config.metrics.flushIntervalMs);
};

// Update timing function to respect sampling rate
export const measureTime = (label: string) => {
  const config = configManager.getPerformanceConfig();
  
  if (!config.metrics.enabled || Math.random() > config.metrics.sampleRate) {
    // Return no-op version when disabled or not sampled
    return {
      end: () => ({ label, duration: 0, timestamp: Date.now() }),
    };
  }

  const startTime = performance.now();
  return {
    end: () => {
      const duration = performance.now() - startTime;
      const metrics = { label, duration, timestamp: Date.now() };
      
      if (duration > config.monitoring.threshold.responseTime) {
        performanceEmitter.emit('threshold-exceeded', {
          type: 'responseTime',
          value: duration,
          threshold: config.monitoring.threshold.responseTime,
        });
      }
      
      return metrics;
    },
  };
};

export const withTiming = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  const result = await operation();
  const metrics = timing.end();
  return { result, metrics };
};

// Enhanced withTiming with Error Handling
export const withTimingAndErrorHandling = async <T>(
  operation: () => Promise<T>,
  label: string,
  errorConfig?: Partial<ErrorHandlerConfig>
): Promise<TimingResult<T>> => {
  const timing = measureTime(label);
  try {
    const result = await withRetry(operation, errorConfig);
    const metrics = timing.end();
    return { result, metrics };
  } catch (error) {
    const metrics = timing.end();
    performanceEmitter.emit('error', { error, metrics });
    throw error;
  }
};

// Memory Monitoring
export const getMemoryUsage = (): number | undefined => {
  if (Platform.OS === 'web') {
    return performance?.memory?.usedJSHeapSize;
  }
  // For React Native, we could potentially add platform-specific implementations
  // using native modules for more accurate memory metrics
  return undefined;
};

// Enhanced Batch Operations
export const batchOperationsWithMetrics = async <T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: {
    batchSize?: number;
    label?: string;
    onBatchComplete?: (metrics: PerformanceMetrics) => void;
    errorConfig?: Partial<ErrorHandlerConfig>;
  } = {}
) => {
  const {
    batchSize = 5,
    label = 'batchOperation',
    onBatchComplete,
    errorConfig
  } = options;

  const totalMetrics: PerformanceMetrics[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const timing = measureTime(`${label}_batch_${i}`);
    
    try {
      await Promise.all(
        batch.map(item => 
          withRetry(() => operation(item), errorConfig)
        )
      );
      
      const metrics = timing.end();
      totalMetrics.push(metrics);
      onBatchComplete?.(metrics);
    } catch (error) {
      const metrics = timing.end();
      performanceEmitter.emit('batchError', { error, batchIndex: i, metrics });
      throw error;
    }
  }

  return totalMetrics;
};

// Performance Queue for Critical Operations
class PerformanceQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private errorConfig: Partial<ErrorHandlerConfig> = {
    retryAttempts: 2,
    timeoutMs: 10000,
    onError: (error) => {
      performanceEmitter.emit('queueError', error);
    }
  };

  setErrorConfig(config: Partial<ErrorHandlerConfig>) {
    this.errorConfig = { ...this.errorConfig, ...config };
  }

  async add(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    if (!this.isProcessing) {
      await this.process();
    }
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        const timing = measureTime('queuedOperation');
        try {
          await withRetry(operation, this.errorConfig);
        } catch (error) {
          performanceEmitter.emit('error', error);
        } finally {
          timing.end();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    this.isProcessing = false;
  }
}

export const performanceQueue = new PerformanceQueue();

// Keep existing utilities
export const deferredOperation = (operation: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    operation();
  });
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; executionTime: number }> => {
  const start = performance.now();
  const result = await operation();
  const executionTime = performance.now() - start;
  return { result, executionTime };
};

// Usage Example:
/*
performanceEmitter.on('timing', (metrics) => {
  console.log('Performance metrics:', metrics);
});

// Example usage of withTiming
const result = await withTiming(
  async () => {
    // Your async operation here
    return 'result';
  },
  'myOperation'
);

// Example usage of batchOperationsWithMetrics
const items = [1, 2, 3, 4, 5];
const metrics = await batchOperationsWithMetrics(
  items,
  async (item) => {
    // Process item
  },
  {
    batchSize: 2,
    label: 'itemProcessing',
    onBatchComplete: (metrics) => {
      console.log('Batch completed:', metrics);
    }
  }
);

// Example with Error Handling
try {
  const result = await withTimingAndErrorHandling(
    async () => {
      // Your operation here
      return 'result';
    },

