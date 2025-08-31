import { test, expect } from '@playwright/test';

test.describe('Messaging E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Mock Wallet Connection
    await page.evaluate(() => {
      window.localStorage.setItem('wallet-connected', 'true');
      window.localStorage.setItem('wallet-address', '0x123...');
    });
  });

  test('kompletter Messaging Flow', async ({ page }) => {
    // Profil Setup
    await test.step('Profil erstellen', async () => {
      await page.fill('[data-testid="profile-username"]', 'TestUser');
      await page.fill('[data-testid="profile-bio"]', 'Test Bio');
      await page.click('[data-testid="save-profile"]');
      await expect(page.locator('[data-testid="profile-saved"]')).toBeVisible();
    });

    // Nachricht senden
    await test.step('Nachricht senden', async () => {
      await page.fill('[data-testid="recipient-address"]', '0x456...');
      await page.fill('[data-testid="message-content"]', 'Test Message');
      await page.click('[data-testid="send-message"]');
      await expect(page.locator('[data-testid="message-sent"]')).toBeVisible();
    });

    // Nachricht empfangen
    await test.step('Nachricht empfangen', async () => {
      await page.click('[data-testid="inbox"]');
      const message = await page.locator('[data-testid="message-item"]').first();
      await expect(message).toContainText('Test Message');
    });
  });

  test('Fehlerszenarien', async ({ page }) => {
    await test.step('Ungültige Wallet-Adresse', async () => {
      await page.fill('[data-testid="recipient-address"]', 'invalid');
      await page.click('[data-testid="send-message"]');
      await expect(page.locator('[data-testid="error-message"]'))
        .toContainText('Ungültige Wallet-Adresse');
    });

    await test.step('Offline Verhalten', async () => {
      await page.context().setOffline(true);
      await page.fill('[data-testid="message-content"]', 'Offline Message');
      await page.click('[data-testid="send-message"]');
      await expect(page.locator('[data-testid="offline-queue"]')).toBeVisible();
    });
  });
});