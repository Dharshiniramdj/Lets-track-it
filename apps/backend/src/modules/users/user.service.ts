import crypto from 'node:crypto';
import { DataStore, AccountRecord, UserRecord } from '../../common/db/data-store.js';
import { ApiError } from '../../common/errors/api-error.js';

export interface CreateAccountDto {
  name: string;
  type: 'PERSONAL' | 'FAMILY' | 'BUSINESS';
  color?: string;
  avatarSeed?: string;
}

export interface AddMemberDto {
  email: string;
  role: 'OWNER' | 'MEMBER' | 'VIEWER';
}

export class UserService {
  public static getUserProfile(userId: string): UserRecord {
    const user = DataStore.users.get(userId);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  public static updateProfile(userId: string, updates: Partial<{ fullName: string; currencyPreference: string }>): UserRecord {
    const user = DataStore.users.get(userId);
    if (!user) throw ApiError.notFound('User not found');

    if (updates.fullName) user.fullName = updates.fullName.trim();
    if (updates.currencyPreference) user.currencyPreference = updates.currencyPreference.toUpperCase();

    DataStore.users.set(user.id, user);
    return user;
  }

  public static getUserAccounts(userId: string): AccountRecord[] {
    return Array.from(DataStore.accounts.values()).filter(acc =>
      acc.ownerId === userId || acc.members.some(m => m.userId === userId)
    );
  }

  public static createAccount(userId: string, dto: CreateAccountDto): AccountRecord {
    const account: AccountRecord = {
      id: crypto.randomUUID(),
      name: dto.name.trim(),
      type: dto.type,
      color: dto.color || '#6366f1',
      avatarSeed: dto.avatarSeed || 'minimal_avatar',
      ownerId: userId,
      members: [{ userId, role: 'OWNER' }],
      createdAt: Date.now()
    };

    DataStore.accounts.set(account.id, account);
    return account;
  }

  public static addAccountMember(userId: string, accountId: string, dto: AddMemberDto): AccountRecord {
    const account = DataStore.accounts.get(accountId);
    if (!account) throw ApiError.notFound('Account not found');

    // Only owner can invite
    if (account.ownerId !== userId) {
      throw ApiError.forbidden('Only the account owner can invite members');
    }

    const targetUser = Array.from(DataStore.users.values()).find(
      u => u.email.toLowerCase() === dto.email.trim().toLowerCase()
    );

    if (!targetUser) {
      throw ApiError.notFound(`No user found with email ${dto.email}`);
    }

    if (account.members.some(m => m.userId === targetUser.id)) {
      throw ApiError.badRequest('User is already a member of this account');
    }

    account.members.push({ userId: targetUser.id, role: dto.role });
    DataStore.accounts.set(account.id, account);
    return account;
  }

  public static removeAccountMember(userId: string, accountId: string, memberUserId: string): AccountRecord {
    const account = DataStore.accounts.get(accountId);
    if (!account) throw ApiError.notFound('Account not found');

    if (account.ownerId !== userId) {
      throw ApiError.forbidden('Only the account owner can remove members');
    }

    if (memberUserId === account.ownerId) {
      throw ApiError.badRequest('Cannot remove the account owner');
    }

    account.members = account.members.filter(m => m.userId !== memberUserId);
    DataStore.accounts.set(account.id, account);
    return account;
  }
}
