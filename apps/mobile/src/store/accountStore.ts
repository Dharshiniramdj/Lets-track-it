import { create } from 'zustand';

export interface MobileAccount {
  id: string;
  name: string;
  type: 'PERSONAL' | 'FAMILY' | 'BUSINESS';
  color: string;
  avatarSeed?: string;
  ownerId: string;
  members: Array<{ userId: string; role: 'OWNER' | 'MEMBER' | 'VIEWER' }>;
}

interface AccountState {
  accounts: MobileAccount[];
  activeAccountId: string | null;
  isLoading: boolean;

  setAccounts: (accounts: MobileAccount[]) => void;
  setActiveAccount: (accountId: string) => void;
  getActiveAccount: () => MobileAccount | undefined;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  activeAccountId: null,
  isLoading: false,

  setAccounts: (accounts) => {
    const currentActive = get().activeAccountId;
    const activeExists = accounts.some(a => a.id === currentActive);
    set({
      accounts,
      activeAccountId: activeExists ? currentActive : accounts[0]?.id || null
    });
  },

  setActiveAccount: (accountId) => set({ activeAccountId: accountId }),

  getActiveAccount: () => {
    const { accounts, activeAccountId } = get();
    return accounts.find(a => a.id === activeAccountId) || accounts[0];
  }
}));
