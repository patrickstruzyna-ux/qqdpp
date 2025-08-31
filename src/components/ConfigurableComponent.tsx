import React from 'react';
import { useConfig } from '../hooks/useConfig';

export const ConfigurableComponent: React.FC = () => {
  const apiEndpoint = useConfig(config => config.network.endpoints.api);
  const isDarkMode = useConfig(config => config.features.darkMode);
  const performanceConfig = useConfig(config => config.performance);

  return (
    <div className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <h2>Current Configuration</h2>
      <pre>
        API Endpoint: {apiEndpoint}
        Performance Metrics Enabled: {performanceConfig.metrics.enabled ? 'Yes' : 'No'}
        Sample Rate: {performanceConfig.metrics.sampleRate * 100}%
      </pre>
    </div>
  );
};