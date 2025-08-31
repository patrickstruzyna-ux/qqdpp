export const environments = {
  development: {
    API_URL: 'http://localhost:3000',
    WS_URL: 'ws://localhost:3001',
    CONTRACT_ADDRESS: '0x123...', // Development contract address
  },
  staging: {
    API_URL: 'https://staging-api.example.com',
    WS_URL: 'wss://staging-ws.example.com',
    CONTRACT_ADDRESS: '0x456...', // Staging contract address
  },
  production: {
    API_URL: 'https://api.example.com',
    WS_URL: 'wss://ws.example.com',
    CONTRACT_ADDRESS: '0x789...', // Production contract address
  },
};

export type Environment = keyof typeof environments;