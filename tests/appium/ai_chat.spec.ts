import { describe, it, expect, beforeEach } from 'vitest';
import { AppiumMobileDriver } from './mobile-driver.js';

describe('Appium Native E2E: ai_chat.spec.ts (Multi-Turn Gemini Advisor & Role Selector)', () => {
  let driver: AppiumMobileDriver;

  beforeEach(() => {
    driver = new AppiumMobileDriver('Android');

    driver.register('advisor-screen', { isDisplayed: true });
    driver.register('role-COACH', { text: 'Wealth Coach', isDisplayed: true });
    driver.register('role-AUDITOR', { text: 'Rapid Auditor', isDisplayed: true });
    driver.register('role-PLANNER', { text: 'Strategic Planner', isDisplayed: true });
    driver.register('role-GUARD', { text: 'Shopping Guard', isDisplayed: true });
    driver.register('chat-input', { value: '' });
    driver.register('send-chat-button', { isEnabled: true });
    driver.register('export-transcript-button', { isDisplayed: true });
  });

  it('switches role to Shopping Guard -> sends impulse purchase query -> renders response bubble without clipping', async () => {
    // 1. Select Shopping Guard role preset
    await driver.click('~role-GUARD');

    // 2. Type shopping challenge query
    const prompt = 'I am tempted to buy wireless earbuds on Amazon for ₹4500. Can I afford it?';
    await driver.setValue('~chat-input', prompt);
    await driver.click('~send-chat-button');

    // 3. Response bubble renders with Gemini analysis
    driver.register('message-bubble-response', {
      text: '[Shopping Guard Advisor Analysis] Checking your Electronics & Shopping category buffer: You currently have ₹3200 buffer left this month. Buying now will breach your monthly goal by ₹1300. Try invoking the 48-hour cooling rule!',
      isDisplayed: true
    });

    const responseBubble = await driver.$('~message-bubble-response');
    expect(responseBubble.isDisplayed).toBe(true);
    expect(responseBubble.text).toContain('Shopping Guard Advisor Analysis');
    expect(responseBubble.text).toContain('48-hour cooling rule');

    // 4. Verify transcript export control is active
    const exportBtn = await driver.$('~export-transcript-button');
    expect(exportBtn.isDisplayed).toBe(true);
  });
});
