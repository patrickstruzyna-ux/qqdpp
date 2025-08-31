import { test, expect } from '@playwright/test';

test.describe('Vollständiger Messaging Flow', () => {
  test('Kompletter User Journey', async ({ page }) => {
    // 1. Wallet Verbindung
    await page.goto('/');
    await page.click('[data-testid="connect-wallet"]');
    
    // 2. Profil erstellen
    await page.fill('[data-testid="username"]', 'TestUser');
    await page.click('[data-testid="save-profile"]');
    
    // 3. Nachricht senden
    await page.fill('[data-testid="recipient"]', '0x123...');
    await page.fill('[data-testid="message"]', 'Test Message');
    await page.click('[data-testid="send"]');
    
    // 4. Nachricht empfangen
    const message = await page.waitForSelector('[data-testid="message-item"]');
    expect(await message.textContent()).toContain('Test Message');
  });
});