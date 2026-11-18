import { create } from 'zustand';

export interface QueuedMutation {
  id: string;
  idempotencyKey: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  payload: any;
  createdAt: number;
}

interface OfflineQueueState {
  queue: QueuedMutation[];
  isOnline: boolean;
  isSyncing: boolean;

  setOnlineStatus: (isOnline: boolean) => void;
  enqueueMutation: (mutation: Omit<QueuedMutation, 'id' | 'createdAt'>) => void;
  dequeueMutation: (id: string) => void;
  clearQueue: () => void;
  setSyncing: (isSyncing: boolean) => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>((set) => ({
  queue: [],
  isOnline: true,
  isSyncing: false,

  setOnlineStatus: (isOnline) => set({ isOnline }),

  enqueueMutation: (mutation) =>
    set((state) => ({
      queue: [
        ...state.queue,
        {
          ...mutation,
          id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: Date.now()
        }
      ]
    })),

  dequeueMutation: (id) =>
    set((state) => ({
      queue: state.queue.filter(m => m.id !== id)
    })),

  clearQueue: () => set({ queue: [] }),

  setSyncing: (isSyncing) => set({ isSyncing })
}));
