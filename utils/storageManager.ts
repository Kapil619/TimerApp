import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timer, HistoryItem } from './types';

export class StorageManager {
    static async loadTimers(): Promise<Timer[]> {
        try {
            const storedTimers = await AsyncStorage.getItem("timers");
            if (storedTimers) {
                return JSON.parse(storedTimers);
            }
            return [];
        } catch (error) {
            console.error("Failed to load timers:", error);
            return [];
        }
    }

    static async saveTimers(timers: Timer[]): Promise<void> {
        try {
            await AsyncStorage.setItem("timers", JSON.stringify(timers));
        } catch (error) {
            console.error("Failed to save timers:", error);
        }
    }

    static async saveToHistory(timer: Timer): Promise<void> {
        try {
            const historyItem: HistoryItem = {
                id: Date.now().toString(),
                name: timer.name,
                category: timer.category,
                completedAt: new Date().toISOString(),
                originalDuration: timer.originalDuration,
            };

            const existingHistory = await AsyncStorage.getItem("timerHistory");
            const history = existingHistory ? JSON.parse(existingHistory) : [];
            history.push(historyItem);
            await AsyncStorage.setItem("timerHistory", JSON.stringify(history));
        } catch (error) {
            console.error("Failed to save to history:", error);
        }
    }

    static async loadCategoryFilter(): Promise<string> {
        try {
            const savedFilter = await AsyncStorage.getItem("categoryFilter");
            return savedFilter || "All";
        } catch (error) {
            console.error("Failed to load category filter:", error);
            return "All";
        }
    }

    static async saveCategoryFilter(filter: string): Promise<void> {
        try {
            await AsyncStorage.setItem("categoryFilter", filter);
        } catch (error) {
            console.error("Failed to save filter:", error);
        }
    }

    static async clearCategoryFilter(): Promise<void> {
        try {
            await AsyncStorage.removeItem("categoryFilter");
        } catch (error) {
            console.error("Failed to clear filter:", error);
        }
    }

    static async loadHistory(): Promise<HistoryItem[]> {
        try {
            const storedHistory = await AsyncStorage.getItem("timerHistory");
            if (storedHistory) {
                return JSON.parse(storedHistory);
            }
            return [];
        } catch (error) {
            console.error("Failed to load history:", error);
            return [];
        }
    }

    static async clearHistory(): Promise<void> {
        try {
            await AsyncStorage.removeItem("timerHistory");
        } catch (error) {
            console.error("Failed to clear history:", error);
        }
    }
}
