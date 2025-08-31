import { test, expect } from '@playwright/test';
import { EncryptionService } from '../../services/EncryptionService';
import { WalletService } from '../../services/WalletService';
import { ethers } from 'ethers';

describe('Sicherheitstests', () => {
  describe('Verschlüsselung', () => {
    test('Ende-zu-Ende Verschlüsselung', async () => {
      const encryptionService = new EncryptionService();
      const message = 'Geheime Nachricht';
      const keys = await encryptionService.generateKeyPair();
      
      const encrypted = await encryptionService.encrypt(message, keys.publicKey);
      const decrypted = await encryptionService.decrypt(encrypted, keys.privateKey);
      
      expect(decrypted).toBe(message);
      expect(encrypted).not.toBe(message);
    });

    test('Schlüssel-Rotation', async () => {
      const encryptionService = new EncryptionService();
      const oldKeys = await encryptionService.getCurrentKeys();
      await encryptionService.rotateKeys();
      const newKeys = await encryptionService.getCurrentKeys();
      
      expect(newKeys).not.toEqual(oldKeys);
    });
  });

  describe('Wallet Sicherheit', () => {
    test('Signatur Verifizierung', async () => {
      const walletService = new WalletService();
      const message = 'Test Message';
      const signature = await walletService.signMessage(message);
      const isValid = await walletService.verifySignature(message, signature);
      
      expect(isValid).toBe(true);
    });

    test('Replay Attack Prevention', async () => {
      const walletService = new WalletService();
      const nonce = Date.now();
      const message = `Message-${nonce}`;
      const signature = await walletService.signMessage(message);
      
      // Zweiter Versuch mit gleichem Nonce sollte fehlschlagen
      await expect(
        walletService.verifyAndProcessMessage(message, signature, nonce)
      ).rejects.toThrow('Nonce bereits verwendet');
    });
  });
});