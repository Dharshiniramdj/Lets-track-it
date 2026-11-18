import { describe, it, expect, beforeEach } from 'vitest';
import { GeminiService, ROLE_PROFILES } from '../../src/modules/ai/gemini.service.js';
import { DataStore, AccountRecord } from '../../src/common/db/data-store.js';

describe('GeminiService Financial Chatbot & Ingestion Tests', () => {
  const userId = 'user-gemini-test';
  const accountId = 'acc-gemini-1';

  beforeEach(() => {
    DataStore.clear();

    const account: AccountRecord = {
      id: accountId,
      name: 'Primary Hub',
      type: 'PERSONAL',
      color: '#6366f1',
      ownerId: userId,
      members: [{ userId, role: 'OWNER' }],
      createdAt: Date.now()
    };
    DataStore.accounts.set(accountId, account);
  });

  it('verifies 4 specialized advisor roles with appropriate models', () => {
    expect(ROLE_PROFILES.COACH.name).toBe('Wealth Coach');
    expect(ROLE_PROFILES.COACH.model).toBe('gemini-3.5-flash');

    expect(ROLE_PROFILES.AUDITOR.name).toBe('Rapid Auditor');
    expect(ROLE_PROFILES.AUDITOR.model).toBe('gemini-3.1-flash-lite');

    expect(ROLE_PROFILES.PLANNER.name).toBe('Strategic Planner');
    expect(ROLE_PROFILES.PLANNER.model).toBe('gemini-3.1-pro-preview');

    expect(ROLE_PROFILES.GUARD.name).toBe('Shopping Guard');
    expect(ROLE_PROFILES.GUARD.model).toBe('gemini-3.5-flash');
  });

  it('builds real-time financial context injection with active account numbers', () => {
    const context = GeminiService.buildLiveFinancialContext(userId, accountId);
    expect(context).toContain('USER REAL-TIME FINANCIAL DOSSIER');
    expect(context).toContain('Primary Hub');
  });

  it('parses natural language quick commerce impulse purchase (Zepto/Blinkit)', async () => {
    const parsed = await GeminiService.parseNaturalLanguage('Ordered milk and eggs on Zepto for 180 rs');
    expect(parsed.amount).toBe(180);
    expect(parsed.category).toBe('GROCERY');
    expect(parsed.isShopping).toBe(true);
    expect(parsed.shoppingDetails?.appName).toBe('Zepto');
  });

  it('parses online shopping retail purchase (Amazon/Flipkart)', async () => {
    const parsed = await GeminiService.parseNaturalLanguage('Bought mechanical keyboard from Amazon for 2500');
    expect(parsed.amount).toBe(2500);
    expect(parsed.isShopping).toBe(true);
    expect(parsed.shoppingDetails?.appName).toBe('Amazon');
  });

  it('simulates multi-turn chat response with live financial context when in offline mode', async () => {
    const res = await GeminiService.chat(userId, {
      role: 'COACH',
      messages: [{ role: 'user', content: 'How is my grocery budget pacing this month?' }],
      accountId
    });

    expect(res.response).toContain('Wealth Coach Advisor Analysis');
    expect(res.model).toBe('gemini-3.5-flash');
  });

  it('parses receipt images with simulated OCR fallback', async () => {
    const res = await GeminiService.parseReceiptImage('data:image/jpeg;base64,samplebase64data');
    expect(res.amount).toBeGreaterThan(0);
    expect(res.category).toBeDefined();
  });
});
