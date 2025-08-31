# Projekt: DecentralizedMessenger / dApp + React/React Native Monorepo

## 1) Projektanforderungen
- Plattformen: React Native (iOS/Android) App unter `DecentralizedMessenger/`, Web/Node-Utilities unter Repo-Wurzel `src/`
- Smart Contracts: Solidity (Hardhat) mit Contracts `contracts/` (Root) und `DecentralizedMessenger/contracts/`; Artefakte unter `DecentralizedMessenger/artifacts/`
- Kryptografie: Nutzung react-native-quick-crypto, eigene EncryptionServices, sichere Schlüsselverwaltung (.env, generate-key Skripte)
- Messaging: On-/Off-chain Messaging via `MessagingContract`/`MessengerService` inkl. Queue, Notifications
- Offline-Fähigkeit: Storage, Queueing, Replays; Service Worker (public/sw.js) für Web
- Tests: Jest/TS Tests (RN und Root), e2e/benchmarks vorhanden
- Tooling: TypeScript, ESLint/Prettier, Metro bundler, Gradle/Xcode, Hardhat, Scripts für Deploy/Upgrade/Verify
- CI/CD (implizit): Build- und Fix-Skripte, Android Release Builds, Lokale Deployments
- Sicherheit/Privacy: Private Keys, Push-Benachrichtigungen, Verschlüsselung End-to-End, keine Secrets im Repo

## 2) Beschreibung/Funktionalität
- Benutzer-Profile: ProfileManager, profileSlice, UserProfile Komponenten (Web & RN)
- Wallet/Keys: WalletContext, Web3Provider, generate-keys, LockUpgradeable Upgrade-Skripte
- Messaging-Kern: MessengerService, MessageQueue, MessagingContract-Wrapper, hooks/useMessenger
- Benachrichtigungen: NotificationService (+ Tests), RN Push-Konfigurationen/Skripte
- Storage/Offline: OfflineStorage, Storage, MessageStore, Replays; Service Worker
- UI/Navigation: RN App (App.tsx, Navigation), Web UI Komponenten (UserProfile, LoadingScreen, ErrorBoundary)
- Deploy/Dev-Flows: Scripts für deploy, deploy_upgradeable, upgrade, verify; Android/iOS Projektdateien, Gradle/Pods
- Kryptografie: EncryptionService (Web & RN), utils/crypto.js, QuickCrypto-Integration, getRandomValues Fixes

## 3) Status / Todos (detailliert)
- Build/Dev
  - RN Android Build-Skripte zahlreich vorhanden (fix-*, build-*, update-*) → Stabilisierung konsolidieren
  - iOS: Pods/Configs liegen vor, Status unklar, CI Setup fehlt
  - Web: vorhandene src/* Struktur, Tests vorhanden, Build/Serve Pipelines unklar
- Verträge/Blockchain
  - Contracts vorhanden (MessagingContract, Messenger, LockUpgradeable, V2) + Artefakte
  - Deploy-/Upgrade-Skripte vorhanden, Netzwerkkonfig/ENV prüfen
- Kryptografie
  - Viele QuickCrypto-Patches/Backups → Plattformkompatibilität sensibel; dauerhafte Lösung/Version pinnen
- Tests/Qualität
  - Jest-Konfigurationen vorhanden; Tests teils geschrieben (RN Notification, Web Encryption/Offline/Profile)
  - E2E/Bench vorhanden, aber Automatisierung/CI unklar
- Sicherheit
  - .env Dateien existieren; Key-Handling-Skripte; Audit ENV/Secrets notwendig
- Dokumentation
  - Mehrere READMEs/Docs vorhanden (API_SETUP, DEPLOYMENT, OFFLINE_SUPPORT, USER_PROFILES, testing)
  - Beitragende Richtlinien/Runbooks für Dev fehlend

## 4) Was noch zu tun ist
- Plattformübergreifendes Build vereinheitlichen
  - RN: Reduktion der fix-* Skripte, dokumentierter Standard-Build (Gradle/Pods), reproduzierbare Umgebung
  - Web: package.json Scripts für build/test/lint/start prüfen/ergänzen, Vite/CRA/Next klären
- CI/CD
  - GitHub Actions/CI Pipeline für Lint/Typecheck/Test/Build, Android Release/Artifacts, iOS Build (optional)
  - Hardhat Tests in CI, Contract Deploy auf Testnet mit Secrets via ENV
- Kryptografie
  - Abhängigkeiten pinnen, QuickCrypto Patch in gepflegte Fork/Version überführen, Security Review
- Sicherheit/Secrets
  - Secret-Scanning, .env.example vervollständigen, Key Rotation/Backup-Prozess, App Signing getrennt halten
- Tests
  - E2E stabilisieren (Determinismus, Mocks), Coverage erhöhen für Services (MessengerService, MessageQueue)
  - Contract-Integrationstests mit Hardhat (events, gas, edge cases)
- Offline/Sync
  - Konsistente Queue-Replays, Konfliktauflösung, Persistenzstrategie (AsyncStorage/SQLite)
- Dokumentation
  - End-to-End Developer Guide (Setup → Deploy → Mobile Builds), Troubleshooting Matrix
- UX/Produkt
  - Fehlermeldungen/Retry-Mechanismen, Lade-/Sync-Status, Profilverwaltung vervollständigen

## 5) Fortschritt (Schätzung)
- Architektur/Grundgerüst: 75%
- Mobile App (RN iOS/Android): 65% (Android weiter; iOS unklar)
- Web/Shared Module: 60%
- Smart Contracts + Deploy-Skripte: 70%
- Kryptografie/Integration: 70% (stabilisieren nötig)
- Tests (unit/integration/e2e/bench): 55%
- CI/CD/Automatisierung: 30%
- Doku/Runbooks: 50%

Gesamter Fortschritt (gewichtete Schätzung): 60%