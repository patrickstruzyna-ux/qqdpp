import React, { useEffect, useState } from 'react';
import { configManager } from '../config/ConfigManager';
import { ApiService } from '../services/ApiService';
import { PerformanceMonitor } from '../services/PerformanceMonitor';

export const DataLoader: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const apiService = new ApiService();
  const performanceMonitor = new PerformanceMonitor();

  useEffect(() => {
    // Konfiguration für Development-Umgebung anpassen
    if (__DEV__) {
      configManager.updateConfig({
        network: {
          timeout: 10000, // Längeres Timeout für Entwicklung
          endpoints: {
            api: 'http://localhost:3000',
          },
        },
      });
    }

    const loadData = async () => {
      const startTime = performance.now();
      
      try {
        const result = await apiService.fetchData('/api/data');
        setData(result);
        
        // Performance messen
        const duration = performance.now() - startTime;
        performanceMonitor.recordMetric('data_load_time', duration);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();

    // Cleanup
    return () => {
      apiService.cleanup();
    };
  }, []);

  return (
    <div>
      {data ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};