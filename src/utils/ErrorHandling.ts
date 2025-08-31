import { performanceEmitter } from './Performance';

// Custom Error Types
export class PerformanceError extends Error {
  constructor(
    message: string,
    public readonly metrics?: {
      executionTime?: number;
      memoryUsage?: number;
      operationType?: string;
    }
  ) {
    super(message);
    this.name = 'PerformanceError';
  }
}

export class OperationTimeoutError extends PerformanceError {
  constructor(operationType: string, timeoutMs: number) {
    super(`Operation ${operationType} timed out after ${timeoutMs}ms`, {
      operationType,
      executionTime: timeoutMs,
    });
    this.name = 'OperationTimeoutError';
  }
}

// Error Handler Configuration
export interface ErrorHandlerConfig {
  timeoutMs: number;
  retryAttempts: number;
  retryDelay: number;
  shouldRetry: (error: Error) => boolean;
  onError: (error: Error) => void;
}

const defaultConfig: ErrorHandlerConfig = {
  timeoutMs: 5000,
  retryAttempts: 3,
  retryDelay: 1000,
  shouldRetry: (error: Error) => !(error instanceof OperationTimeoutError),
  onError: (error: Error) => {
    console.error('Operation failed:', error);
    performanceEmitter.emit('error', error);
  },
};

// Error Handling Utilities
export const withTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationType: string
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new OperationTimeoutError(operationType, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([operation(), timeoutPromise]);
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  config: Partial<ErrorHandlerConfig> = {}
): Promise<T> => {
  const finalConfig = { ...defaultConfig, ...config };
  let lastError: Error;
  
  for (let attempt = 0; attempt < finalConfig.retryAttempts; attempt++) {
    try {
      return await withTimeout(
        operation,
        finalConfig.timeoutMs,
        'retryableOperation'
      );
    } catch (error) {
      lastError = error as Error;
      
      if (!finalConfig.shouldRetry(lastError)) {
        break;
      }
      
      if (attempt < finalConfig.retryAttempts - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, finalConfig.retryDelay * (attempt + 1))
        );
      }
    }
  }
  
  finalConfig.onError(lastError!);
  throw lastError;
};

// Error Boundary für async Operationen
export const createErrorBoundary = <T>(
  operation: () => Promise<T>,
  fallback: T,
  config: Partial<ErrorHandlerConfig> = {}
): Promise<T> => {
  return withRetry(operation, config).catch(error => {
    config.onError?.(error);
    return fallback;
  });
};