import { performance } from 'perf_hooks';
import { MessagingContract } from '../../services/MessagingContract';
import { EncryptionService } from '../../services/EncryptionService';

describe('Performance Tests', () => {
  describe('Nachrichtenverarbeitung', () => {
    test('Massenverarbeitung von Nachrichten', async () => {
      const contract = new MessagingContract();
      const messages = Array(100).fill('Test Message');
      
      const start = performance.now();
      
      for (const msg of messages) {
        await contract.sendMessage('0x123...', msg);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(30000); // Max 30 Sekunden
    });

    test('Verschlüsselungsperformance', async () => {
      const encryptionService = new EncryptionService();
      const message = 'Test'.repeat(1000); // 4KB Message
      
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        await encryptionService.encrypt(message, 'publicKey');
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000); // Max 1 Sekunde
    });
  });

  describe('Speicher und Netzwerk', () => {
    test('Offline Storage Limits', async () => {
      const storage = new OfflineStorage();
      const largeMessage = 'X'.repeat(1000000); // 1MB
      
      for (let i = 0; i < 100; i++) {
        await storage.store(`msg-${i}`, largeMessage);
      }
      
      const usage = await storage.getUsage();
      expect(usage).toBeLessThan(100 * 1024 * 1024); // Max 100MB
    });
  });
});