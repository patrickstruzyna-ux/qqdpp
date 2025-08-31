import { test, expect } from '@playwright/test';

test.describe('Messaging Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Connect wallet
    await page.click('[data-testid="connect-wallet"]');
  });

  test('should send and receive messages', async ({ page }) => {
    // Send message
    await page.fill('[data-testid="message-input"]', 'Hello World');
    await page.click('[data-testid="send-button"]');
    
    // Verify message appears in chat
    const message = await page.waitForSelector('[data-testid="message-item"]');
    expect(await message.textContent()).toContain('Hello World');
    
    // Verify message status
    const status = await page.waitForSelector('[data-testid="message-status"]');
    expect(await status.textContent()).toBe('sent');
  });

  test('should handle encryption errors', async ({ page }) => {
    // Simulate encryption error
    await page.evaluate(() => {
      window.localStorage.setItem('encryption-error', 'true');
    });
    
    await page.fill('[data-testid="message-input"]', 'Test');
    await page.click('[data-testid="send-button"]');
    
    const error = await page.waitForSelector('[data-testid="error-message"]');
    expect(await error.textContent()).toContain('Encryption failed');
  });
});