export interface Timer {
    id: string;
    name: string;
    duration: number;
    category: string;
    status: "stopped" | "running" | "paused" | "completed";
    remainingTime: number;
    originalDuration: number;
    halfwayAlert: boolean;
}

export interface HistoryItem {
    id: string;
    name: string;
    category: string;
    completedAt: string;
    originalDuration: number;
}

export interface ToastOptions {
    duration?: number;
    position?: "top" | "bottom";
}

export interface CategorySummary {
    [category: string]: {
        count: number;
        totalTime: number;
    };
}

export interface ExportData {
    timers: Array<{
        name: string;
        category: string;
        duration: number;
        completed: boolean;
        completedAt?: string;
    }>;
    totalTimers: number;
    totalTimeSpent: number;
    categoriesSummary: CategorySummary;
}
