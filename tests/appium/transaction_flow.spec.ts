import { describe, it, expect, beforeEach } from 'vitest';
import { AppiumMobileDriver } from './mobile-driver.js';

describe('Appium Native E2E: transaction_flow.spec.ts (Dual-Mode Ledger & Zepto Shopping)', () => {
  let driver: AppiumMobileDriver;

  beforeEach(() => {
    driver = new AppiumMobileDriver('Android');

    // Register Dashboard & Quick Add Modal elements
    driver.register('dashboard-screen', { isDisplayed: true });
    driver.register('quick-add-fab', { isDisplayed: true, accessibilityLabel: 'Add New Transaction' });
    driver.register('quick-add-modal', { isDisplayed: false });
    driver.register('amount-input', { value: '' });
    driver.register('purpose-input', { value: '' });
    driver.register('mode-toggle-shopping', { isEnabled: true });
    driver.register('quick-merchant-zepto', { text: 'Zepto' });
    driver.register('save-transaction-button', { isEnabled: true });
  });

  it('opens Quick Add -> switches to Shopping mode -> enters Zepto order -> verifies feed & Goal deduction', async () => {
    // 1. Open Quick Add modal from FAB
    await driver.click('~quick-add-fab');
    driver.register('quick-add-modal', { isDisplayed: true });
    expect((await driver.$('~quick-add-modal')).isDisplayed).toBe(true);

    // 2. Select Zepto quick-commerce impulse shortcut
    await driver.click('~quick-merchant-zepto');

    // 3. Enter amount & order purpose
    await driver.setValue('~amount-input', '340');
    await driver.setValue('~purpose-input', 'Zepto 10-Min Groceries (Milk & Cold Brew)');

    // 4. Save transaction
    await driver.click('~save-transaction-button');
    driver.register('quick-add-modal', { isDisplayed: false });

    // 5. Verify arrival in Recent Activity feed with package status badge
    driver.register('transaction-card-zepto-1', {
      text: 'Zepto 10-Min Groceries (Milk & Cold Brew) - ₹340',
      isDisplayed: true
    });
    driver.register('delivery-badge', { text: 'ORDERED', isDisplayed: true });

    const card = await driver.$('~transaction-card-zepto-1');
    const badge = await driver.$('~delivery-badge');
    expect(card.isDisplayed).toBe(true);
    expect(badge.text).toBe('ORDERED');

    // 6. Verify Goal budget headroom deduction
    driver.register('goal-progress-bar', { isDisplayed: true });
    const progressBar = await driver.$('~goal-progress-bar');
    expect(progressBar.isDisplayed).toBe(true);
  });
});
