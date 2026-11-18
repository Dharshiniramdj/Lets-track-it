import { describe, it, expect, beforeEach } from 'vitest';
import { UserService } from '../../src/modules/users/user.service.js';
import { DataStore, UserRecord } from '../../src/common/db/data-store.js';

describe('UserService Multi-Account & Family Unification Tests', () => {
  const primaryUserId = 'user-owner';
  const familyMemberUserId = 'user-family-member';

  beforeEach(() => {
    DataStore.clear();

    const owner: UserRecord = {
      id: primaryUserId,
      email: 'owner@example.com',
      fullName: 'Primary Owner',
      passwordHash: 'hash',
      currencyPreference: 'INR',
      status: 'ACTIVE',
      createdAt: Date.now()
    };

    const familyMember: UserRecord = {
      id: familyMemberUserId,
      email: 'spouse@example.com',
      fullName: 'Family Member',
      passwordHash: 'hash',
      currencyPreference: 'INR',
      status: 'ACTIVE',
      createdAt: Date.now()
    };

    DataStore.users.set(primaryUserId, owner);
    DataStore.users.set(familyMemberUserId, familyMember);
  });

  it('retrieves user profile and updates details', () => {
    const profile = UserService.getUserProfile(primaryUserId);
    expect(profile.email).toBe('owner@example.com');

    const updated = UserService.updateProfile(primaryUserId, {
      fullName: 'Primary Owner Updated',
      currencyPreference: 'USD'
    });

    expect(updated.fullName).toBe('Primary Owner Updated');
    expect(updated.currencyPreference).toBe('USD');
  });

  it('creates isolated accounts: PERSONAL, FAMILY, and BUSINESS', () => {
    const personal = UserService.createAccount(primaryUserId, {
      name: 'My Personal Vault',
      type: 'PERSONAL'
    });

    const business = UserService.createAccount(primaryUserId, {
      name: 'Freelance Tech Works',
      type: 'BUSINESS'
    });

    expect(personal.type).toBe('PERSONAL');
    expect(business.type).toBe('BUSINESS');

    const userAccounts = UserService.getUserAccounts(primaryUserId);
    expect(userAccounts).toHaveLength(2);
  });

  it('manages shared accounts across family members', () => {
    const familyAccount = UserService.createAccount(primaryUserId, {
      name: 'Our Family Budget Hub',
      type: 'FAMILY'
    });

    // Invite spouse as MEMBER
    const updated = UserService.addAccountMember(primaryUserId, familyAccount.id, {
      email: 'spouse@example.com',
      role: 'MEMBER'
    });

    expect(updated.members).toHaveLength(2);
    expect(updated.members.some(m => m.userId === familyMemberUserId)).toBe(true);

    // Verify family member sees this account in their list
    const memberAccounts = UserService.getUserAccounts(familyMemberUserId);
    expect(memberAccounts.some(a => a.id === familyAccount.id)).toBe(true);

    // Remove member
    const afterRemoval = UserService.removeAccountMember(primaryUserId, familyAccount.id, familyMemberUserId);
    expect(afterRemoval.members).toHaveLength(1);
  });
});
