import * as Notifications from 'expo-notifications';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export class NotificationManager {
    private static instance: NotificationManager;
    private notificationIds: { [key: string]: { completion?: string; halfway?: string } } = {};

    static getInstance(): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager.instance;
    }

    async requestNotificationPermissions(): Promise<boolean> {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            console.log("Current notification permission status:", existingStatus);

            if (existingStatus !== "granted") {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
                console.log("Requested notification permission, result:", status);
            }

            return finalStatus === "granted";
        } catch (error) {
            console.error("Error requesting notification permissions:", error);
            return false;
        }
    }

    async scheduleNotification(
        title: string,
        body: string,
        seconds: number,
        identifier?: string
    ): Promise<string | null> {
        try {
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: Math.max(1, seconds), // Ensure minimum 1 second
                },
            });

            console.log(
                `Scheduled notification: ${title} in ${seconds}s with ID: ${notificationId}`
            );
            return notificationId;
        } catch (error) {
            console.error("Failed to schedule notification:", error);
            return null;
        }
    }

    async cancelSpecificNotification(notificationId: string): Promise<void> {
        try {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
            console.log(`Cancelled notification: ${notificationId}`);
        } catch (error) {
            console.error("Failed to cancel specific notification:", error);
        }
    }

    async cancelTimerNotifications(timerId: string): Promise<void> {
        const timerNotifications = this.notificationIds[timerId];
        if (timerNotifications) {
            if (timerNotifications.completion) {
                await this.cancelSpecificNotification(timerNotifications.completion);
            }
            if (timerNotifications.halfway) {
                await this.cancelSpecificNotification(timerNotifications.halfway);
            }
            delete this.notificationIds[timerId];
        }
    }

    async cancelAllNotifications(): Promise<void> {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            this.notificationIds = {};
        } catch (error) {
            console.error("Failed to cancel notifications:", error);
        }
    }

    async scheduleTimerNotifications(
        timerId: string,
        timerName: string,
        remainingTime: number,
        originalDuration: number,
        halfwayAlert: boolean,
        halfwayAlreadyTriggered: boolean
    ): Promise<void> {
        // Cancel any existing notifications for this timer
        await this.cancelTimerNotifications(timerId);

        // Schedule completion notification
        if (remainingTime > 0) {
            const notificationId = await this.scheduleNotification(
                "Timer Completed!",
                `${timerName} has finished!`,
                remainingTime
            );

            if (notificationId) {
                if (!this.notificationIds[timerId]) {
                    this.notificationIds[timerId] = {};
                }
                this.notificationIds[timerId].completion = notificationId;
            }
        }

        // Schedule halfway notification if enabled and not already triggered
        if (halfwayAlert && !halfwayAlreadyTriggered) {
            const halfwayTime = originalDuration / 2;
            const timeToHalfway = remainingTime - halfwayTime;

            if (timeToHalfway > 0) {
                const notificationId = await this.scheduleNotification(
                    "Halfway Alert!",
                    `${timerName} is halfway done!`,
                    timeToHalfway
                );

                if (notificationId) {
                    if (!this.notificationIds[timerId]) {
                        this.notificationIds[timerId] = {};
                    }
                    this.notificationIds[timerId].halfway = notificationId;
                }
            }
        }
    }

    cleanupTimer(timerId: string): void {
        delete this.notificationIds[timerId];
    }

    cleanupAll(): void {
        this.notificationIds = {};
    }
}
