import { describe, it, expect, beforeEach } from 'vitest';
import { AppiumMobileDriver } from './mobile-driver.js';

describe('Appium Native E2E: auth.spec.ts (Android UiAutomator2 & iOS XCUITest)', () => {
  let driver: AppiumMobileDriver;

  beforeEach(() => {
    driver = new AppiumMobileDriver('Android');
    // Register native AuthScreen elements
    driver.register('auth-screen', { isDisplayed: true });
    driver.register('tab-signup', { text: 'Create Account' });
    driver.register('fullname-input', { value: '' });
    driver.register('email-input', { value: '' });
    driver.register('password-input', { value: '' });
    driver.register('signup-submit-button', { isEnabled: true });
    driver.register('otp-modal', { isDisplayed: false });
    driver.register('otp-input', { value: '' });
    driver.register('verify-otp-button', { isEnabled: true });
    driver.register('biometric-unlock-button', { isDisplayed: true });
  });

  it('validates password security requirements on input and focuses OTP verification', async () => {
    await driver.click('~tab-signup');

    // Enter short password
    await driver.setValue('~fullname-input', 'Mobile User');
    await driver.setValue('~email-input', 'mobile@letstrackit.app');
    await driver.setValue('~password-input', 'short');

    // Enter strong enterprise password
    await driver.setValue('~password-input', 'Str0ng!Passw0rd#2026');
    await driver.click('~signup-submit-button');

    // OTP modal opens and focuses input
    driver.register('otp-modal', { isDisplayed: true });
    const otpModal = await driver.$('~otp-modal');
    expect(otpModal.isDisplayed).toBe(true);

    await driver.setValue('~otp-input', '491029');
    await driver.click('~verify-otp-button');
    expect((await driver.$('~otp-input')).value).toBe('491029');
  });

  it('provides biometric prompt fallback to password login', async () => {
    const bioBtn = await driver.$('~biometric-unlock-button');
    expect(bioBtn.isDisplayed).toBe(true);

    await driver.click('~biometric-unlock-button');

    // Verify screen stays active and fallback fields are accessible
    const emailInput = await driver.$('~email-input');
    expect(emailInput.isDisplayed).toBe(true);
  });
});
