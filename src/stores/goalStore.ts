import { create } from 'zustand';
import { db, type Goal } from '@/db/schema';

interface GoalState {
    addGoal: (goal: Omit<Goal, 'id'>) => Promise<number>;
    updateGoal: (id: number, goal: Partial<Goal>) => Promise<number>;
    deleteGoal: (id: number) => Promise<void>;
}

export const useGoalStore = create<GoalState>(() => ({
    addGoal: async (goal) => {
        try {
            return (await db.goals.add(goal)) as number;
        } catch (error) {
            console.error("Failed to add goal", error);
            throw error;
        }
    },

    updateGoal: async (id, goal) => {
        try {
            return await db.goals.update(id, goal);
        } catch (error) {
            console.error("Failed to update goal", error);
            throw error;
        }
    },

    deleteGoal: async (id) => {
        try {
            await db.goals.delete(id);
        } catch (error) {
            console.error("Failed to delete goal", error);
            throw error;
        }
    }
}));
