# Test-Dokumentation

## Übersicht
Diese Dokumentation beschreibt die Teststrategien und -implementierungen für den dezentralen Messenger.

### E2E-Tests
- **Zweck**: Validierung des kompletten Nachrichtenflusses
- **Werkzeuge**: Playwright
- **Ausführung**: `npm run test:e2e`

#### Testabdeckung
- Wallet-Verbindung
- Profilmanagement
- Nachrichtenversand/-empfang
- Offline-Funktionalität
- Fehlerszenarien

### Sicherheitstests
- **Zweck**: Überprüfung der Verschlüsselung und Wallet-Integration
- **Werkzeuge**: Jest, ethers.js
- **Ausführung**: `npm run test:security`

#### Testbereiche
- Ende-zu-Ende-Verschlüsselung
- Schlüsselmanagement
- Signaturvalidierung
- Replay-Attack-Prevention

### Performance-Tests
- **Zweck**: Sicherstellung der Systemleistung
- **Werkzeuge**: Performance Hooks, Custom Benchmarking
- **Ausführung**: `npm run test:performance`

#### Metriken
- Nachrichtendurchsatz
- Verschlüsselungsgeschwindigkeit
- Speichernutzung
- Netzwerklatenz

## Test-Ausführung
```bash
# Alle Tests ausführen
npm run test

# Spezifische Tests
npm run test:e2e
npm run test:security
npm run test:performance
```

## CI/CD-Integration
- Tests werden automatisch bei jedem Push ausgeführt
- Pull Requests erfordern erfolgreiche Tests
- Performance-Benchmarks werden täglich ausgeführt

## Fehlerbehebung
- Bekannte Probleme und Lösungen
- Debugging-Tipps
- Kontaktinformationen für Support