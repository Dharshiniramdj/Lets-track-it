import { create } from 'zustand';

export interface MobileGoal {
  id: string;
  accountId: string;
  category: string;
  targetAmount: number;
  actualSpent: number;
  remainingBuffer: number;
  percentageConsumed: number;
  dailyRecommendedPace: number;
  status: 'SAFE' | 'WARNING' | 'EXCEEDED';
  colorCode: 'GREEN' | 'AMBER' | 'RED';
  month: string;
  notes?: string;
}

interface GoalState {
  goals: MobileGoal[];
  isLoading: boolean;

  setGoals: (goals: MobileGoal[]) => void;
  upsertGoal: (goal: MobileGoal) => void;
  removeGoal: (goalId: string) => void;
  clearGoals: () => void;
}

export const useGoalStore = create<GoalState>((set) => ({
  goals: [],
  isLoading: false,

  setGoals: (goals) => set({ goals }),

  upsertGoal: (goal) =>
    set((state) => ({
      goals: [goal, ...state.goals.filter(g => g.id !== goal.id)]
    })),

  removeGoal: (goalId) =>
    set((state) => ({
      goals: state.goals.filter(g => g.id !== goalId)
    })),

  clearGoals: () => set({ goals: [] })
}));
