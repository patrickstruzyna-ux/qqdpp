# API Setup Guide

## 1. RPC Provider (Alchemy/Infura)

### Alchemy Setup
1. Gehe zu [alchemy.com](https://www.alchemy.com)
2. Erstelle einen Account
3. Erstelle neue Apps für:
   - Sepolia Testnet
   - Ethereum Mainnet
4. Kopiere die RPC URLs:
   ```env
   SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY
   MAINNET_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
   ```

### Alternative: Infura Setup
1. Gehe zu [infura.io](https://infura.io)
2. Erstelle einen Account
3. Erstelle ein neues Projekt
4. Kopiere die RPC URLs:
   ```env
   SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
   MAINNET_URL=https://mainnet.infura.io/v3/YOUR-PROJECT-ID
   ```

## 2. Etherscan API

1. Gehe zu [etherscan.io](https://etherscan.io)
2. Erstelle einen Account
3. Gehe zu API Keys Sektion
4. Erstelle einen neuen API Key
5. Kopiere den API Key in die .env:
   ```env
   ETHERSCAN_API_KEY=your_etherscan_api_key_here
   ```

## 3. Performance Monitoring (Optional)

Basierend auf der Konfiguration in `src/config/defaultConfig.ts`:

### Metrics Setup
1. Konfiguriere Sampling Rate:
   ```typescript
   metrics: {
     enabled: true,
     sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
     flushIntervalMs: 60000,
     maxStorageSize: 1000
   }
   ```

### Tracing Setup
1. Konfiguriere Sampling Rate:
   ```typescript
   tracing: {
     enabled: true,
     samplingRate: 0.01
   }
   ```

## 4. CDN Setup (Optional)

Basierend auf `src/config/types.ts`, wird ein CDN Endpoint benötigt:

1. Wähle einen CDN Provider (z.B. Cloudflare, AWS CloudFront)
2. Konfiguriere die Endpoints:
   ```env
   CDN_URL=https://your-cdn-domain.com
   ```

## 5. WebSocket Endpoints

Basierend auf der Konfiguration werden WebSocket Endpoints benötigt:

### Development
```env
WS_URL=ws://localhost:3001
```

### Production
```env
WS_URL=wss://ws.example.com
```

## 6. Security Configuration

Basierend auf `src/config/types.ts`:

```typescript
security: {
  encryption: {
    algorithm: 'AES-256-GCM',
    keySize: 256
  },
  authentication: {
    tokenExpiryMs: 3600000,  // 1 hour
    refreshTokenExpiryMs: 2592000000  // 30 days
  }
}
```

## Einrichtung der Umgebungsvariablen

1. Kopiere `.env.example` zu `.env`:
```bash
cp .env.example .env
```

2. Fülle alle erforderlichen Variablen aus:
```env
# API Configuration
API_URL=http://localhost:3000

# Blockchain Configuration
PRIVATE_KEY=your_private_key_here
SEPOLIA_URL=your_sepolia_rpc_url
MAINNET_URL=your_mainnet_rpc_url
ETHERSCAN_API_KEY=your_etherscan_api_key

# App Configuration
REACT_APP_CONTRACT_ADDRESS=your_deployed_contract_address

# Performance Monitoring
METRICS_ENABLED=true
METRICS_SAMPLE_RATE=0.1

# CDN Configuration
CDN_URL=https://your-cdn-domain.com

# WebSocket Configuration
WS_URL=wss://ws.example.com

# Security
ENCRYPTION_KEY=your_encryption_key
TOKEN_SECRET=your_jwt_secret
```

## Verifizierung der API-Einrichtung

Führe folgende Tests durch:

1. RPC Verbindung testen:
```bash
npx hardhat node
npx hardhat test
```

2. Etherscan API testen:
```bash
npx hardhat verify --network goerli 0xContractAddress
```

3. WebSocket Verbindung testen:
```typescript
const ws = new WebSocket(process.env.WS_URL);
ws.onopen = () => console.log('Connected to WebSocket');
```

4. CDN Verfügbarkeit testen:
```bash
curl -I ${CDN_URL}/test-asset.jpg
```

## Fehlerbehandlung

### RPC Fehler
- Überprüfe API Keys
- Überprüfe Netzwerk-Verfügbarkeit
- Prüfe Rate Limits

### Etherscan Fehler
- Warte 1 Minute nach Deployment vor Verifizierung
- Überprüfe API Key Gültigkeit
- Prüfe Contract-Bytecode-Match

### WebSocket Fehler
- Überprüfe SSL/TLS Konfiguration
- Prüfe Firewall-Einstellungen
- Implementiere Reconnect-Logik
