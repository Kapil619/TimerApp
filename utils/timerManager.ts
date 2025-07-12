import { Timer } from './types';
import { StorageManager } from './storageManager';
import { NotificationManager } from './notificationManager';

export class TimerManager {
    private timerRefs: { [key: string]: any } = {};
    private halfwayAlerts: { [key: string]: boolean } = {};
    private notificationManager: NotificationManager;
    private onTimersChange: (timers: Timer[]) => void;
    private onToast: (message: string) => void;

    constructor(
        onTimersChange: (timers: Timer[]) => void,
        onToast: (message: string) => void
    ) {
        this.onTimersChange = onTimersChange;
        this.onToast = onToast;
        this.notificationManager = NotificationManager.getInstance();
    }

    formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    getProgressPercentage(timer: Timer): number {
        return (
            ((timer.originalDuration - timer.remainingTime) /
                timer.originalDuration) *
            100
        );
    }

    getAvailableCategories(timers: Timer[]): string[] {
        return [...new Set(timers.map((timer) => timer.category))];
    }

    filterTimersByCategory(timers: Timer[], categoryFilter: string): Timer[] {
        return categoryFilter === "All"
            ? timers
            : timers.filter((timer) => timer.category === categoryFilter);
    }

    groupTimersByCategory(timers: Timer[]): { [key: string]: Timer[] } {
        return timers.reduce((acc, timer) => {
            if (!acc[timer.category]) {
                acc[timer.category] = [];
            }
            acc[timer.category].push(timer);
            return acc;
        }, {} as { [key: string]: Timer[] });
    }

    async startTimerInterval(timerId: string, timers: Timer[]): Promise<void> {
        const timer = timers.find((t) => t.id === timerId);
        if (!timer) return;

        // Schedule notifications
        await this.notificationManager.scheduleTimerNotifications(
            timerId,
            timer.name,
            timer.remainingTime,
            timer.originalDuration,
            timer.halfwayAlert,
            this.halfwayAlerts[timerId] || false
        );

        // Reset halfway alert flag for this timer
        this.halfwayAlerts[timerId] = false;

        // Start the countdown
        this.timerRefs[timerId] = setInterval(async () => {
            const currentTimers = await StorageManager.loadTimers();
            const newTimers = currentTimers
                .map((timer) => {
                    if (timer.id === timerId && timer.status === "running") {
                        const newRemainingTime = timer.remainingTime - 1;

                        // Check for halfway alert (in-app alert only, notification already scheduled)
                        if (
                            timer.halfwayAlert &&
                            !this.halfwayAlerts[timerId] &&
                            newRemainingTime <= timer.originalDuration / 2 &&
                            newRemainingTime > 0
                        ) {
                            this.halfwayAlerts[timerId] = true;
                            setTimeout(() => {
                                this.onToast(
                                    `🔔 ${timer.name} is halfway done! ${Math.floor(
                                        newRemainingTime / 60
                                    )}:${(newRemainingTime % 60)
                                        .toString()
                                        .padStart(2, "0")} remaining`
                                );
                            }, 0);
                        }

                        if (newRemainingTime <= 0) {
                            // Timer completed
                            this.clearTimerInterval(timerId);

                            const completedTimer = {
                                ...timer,
                                status: "completed" as const,
                                remainingTime: 0,
                            };
                            StorageManager.saveToHistory(completedTimer);
                            setTimeout(() => {
                                this.onToast(`🎉 ${timer.name} completed!`);
                            }, 0);

                            // Remove completed timer from the list (it's already saved to history)
                            return null;
                        }

                        return { ...timer, remainingTime: newRemainingTime };
                    }
                    return timer;
                })
                .filter((timer): timer is Timer => timer !== null);

            // Save updated timers
            await StorageManager.saveTimers(newTimers);
            this.onTimersChange(newTimers);
        }, 1000);
    }

    async startTimer(timerId: string, timers: Timer[]): Promise<Timer[]> {
        const updatedTimers = timers.map((timer) => {
            if (timer.id === timerId) {
                return { ...timer, status: "running" as const };
            }
            return timer;
        });

        await StorageManager.saveTimers(updatedTimers);
        this.startTimerInterval(timerId, updatedTimers);
        return updatedTimers;
    }

    async pauseTimer(timerId: string, timers: Timer[]): Promise<Timer[]> {
        this.clearTimerInterval(timerId);
        await this.notificationManager.cancelTimerNotifications(timerId);

        const updatedTimers = timers.map((timer) => {
            if (timer.id === timerId) {
                return { ...timer, status: "paused" as const };
            }
            return timer;
        });

        await StorageManager.saveTimers(updatedTimers);
        return updatedTimers;
    }

    async resetTimer(timerId: string, timers: Timer[]): Promise<Timer[]> {
        this.clearTimerInterval(timerId);
        await this.notificationManager.cancelTimerNotifications(timerId);
        delete this.halfwayAlerts[timerId];

        const updatedTimers = timers.map((timer) => {
            if (timer.id === timerId) {
                return {
                    ...timer,
                    status: "stopped" as const,
                    remainingTime: timer.originalDuration,
                };
            }
            return timer;
        });

        await StorageManager.saveTimers(updatedTimers);
        return updatedTimers;
    }

    async deleteTimer(timerId: string, timers: Timer[]): Promise<Timer[]> {
        this.clearTimerInterval(timerId);
        await this.notificationManager.cancelTimerNotifications(timerId);
        delete this.halfwayAlerts[timerId];

        const updatedTimers = timers.filter((timer) => timer.id !== timerId);
        await StorageManager.saveTimers(updatedTimers);
        return updatedTimers;
    }

    async bulkAction(
        category: string,
        action: "start" | "pause" | "reset",
        timers: Timer[]
    ): Promise<Timer[]> {
        const categoryTimers = timers.filter(
            (timer) => timer.category === category && timer.status !== "completed"
        );

        let updatedTimers = timers;

        for (const timer of categoryTimers) {
            switch (action) {
                case "start":
                    if (timer.status !== "running" && timer.status !== "completed") {
                        updatedTimers = await this.startTimer(timer.id, updatedTimers);
                    }
                    break;
                case "pause":
                    if (timer.status === "running") {
                        updatedTimers = await this.pauseTimer(timer.id, updatedTimers);
                    }
                    break;
                case "reset":
                    updatedTimers = await this.resetTimer(timer.id, updatedTimers);
                    break;
            }
        }

        return updatedTimers;
    }

    restartRunningTimers(timers: Timer[]): void {
        timers.forEach((timer) => {
            if (timer.status === "running") {
                // Clear any existing interval first
                if (this.timerRefs[timer.id]) {
                    clearInterval(this.timerRefs[timer.id]);
                }
                this.startTimerInterval(timer.id, timers);
            }
        });
    }

    private clearTimerInterval(timerId: string): void {
        if (this.timerRefs[timerId]) {
            clearInterval(this.timerRefs[timerId]);
            delete this.timerRefs[timerId];
        }
        delete this.halfwayAlerts[timerId];
        this.notificationManager.cleanupTimer(timerId);
    }

    cleanup(): void {
        // Cleanup intervals on unmount
        Object.values(this.timerRefs).forEach(clearInterval);
        this.timerRefs = {};
        this.halfwayAlerts = {};
        this.notificationManager.cleanupAll();
    }
}
