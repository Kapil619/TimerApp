import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";

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

interface Timer {
  id: string;
  name: string;
  duration: number;
  category: string;
  status: "stopped" | "running" | "paused" | "completed";
  remainingTime: number;
  originalDuration: number;
  halfwayAlert: boolean;
}

interface HistoryItem {
  id: string;
  name: string;
  category: string;
  completedAt: string;
  originalDuration: number;
}

export default function TimersScreen() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const timerRefs = useRef<{ [key: string]: any }>({});
  const halfwayAlerts = useRef<{ [key: string]: boolean }>({});
  const notificationIds = useRef<{
    [key: string]: { completion?: string; halfway?: string };
  }>({});

  const requestNotificationPermissions = async () => {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      console.log("Current notification permission status:", existingStatus);

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log("Requested notification permission, result:", status);
      }

      const hasPermission = finalStatus === "granted";
      setNotificationPermission(hasPermission);

      if (!hasPermission) {
        Alert.alert(
          "Notification Permission",
          "To receive timer completion and halfway alerts, please enable notifications in your device settings.",
          [{ text: "OK" }]
        );
      }

      return hasPermission;
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      return false;
    }
  };

  const scheduleNotification = async (
    title: string,
    body: string,
    seconds: number,
    identifier?: string
  ) => {
    if (!notificationPermission) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) return null;
    }

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
  };

  const cancelSpecificNotification = async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error("Failed to cancel specific notification:", error);
    }
  };

  const cancelTimerNotifications = async (timerId: string) => {
    const timerNotifications = notificationIds.current[timerId];
    if (timerNotifications) {
      if (timerNotifications.completion) {
        await cancelSpecificNotification(timerNotifications.completion);
      }
      if (timerNotifications.halfway) {
        await cancelSpecificNotification(timerNotifications.halfway);
      }
      delete notificationIds.current[timerId];
    }
  };

  const cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Failed to cancel notifications:", error);
    }
  };

  const loadTimers = async () => {
    try {
      const storedTimers = await AsyncStorage.getItem("timers");
      if (storedTimers) {
        const loadedTimers = JSON.parse(storedTimers);
        setTimers(loadedTimers);

        // Restart intervals for running timers
        loadedTimers.forEach((timer: Timer) => {
          if (timer.status === "running") {
            // Clear any existing interval first
            if (timerRefs.current[timer.id]) {
              clearInterval(timerRefs.current[timer.id]);
            }
            startTimerInterval(timer.id);
          }
        });

        // Set all categories as collapsed by default
        const categories = [
          ...new Set(loadedTimers.map((timer: Timer) => timer.category)),
        ] as string[];
        setCollapsedCategories(categories);
      }

      // Load category filter
      const savedFilter = await AsyncStorage.getItem("categoryFilter");
      if (savedFilter) {
        setCategoryFilter(savedFilter);
      }
    } catch (error) {
      console.error("Failed to load timers:", error);
    }
  };

  const saveTimers = async (updatedTimers: Timer[]) => {
    try {
      await AsyncStorage.setItem("timers", JSON.stringify(updatedTimers));
      setTimers(updatedTimers);
    } catch (error) {
      console.error("Failed to save timers:", error);
    }
  };

  const saveToHistory = async (timer: Timer) => {
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
  };

  const startTimerInterval = (timerId: string) => {
    const timer = timers.find((t) => t.id === timerId);
    if (!timer) return;

    // Cancel any existing notifications for this timer
    cancelTimerNotifications(timerId);

    // Schedule completion notification
    if (timer.remainingTime > 0) {
      scheduleNotification(
        "Timer Completed!",
        `${timer.name} has finished!`,
        timer.remainingTime
      ).then((notificationId) => {
        if (notificationId) {
          if (!notificationIds.current[timerId]) {
            notificationIds.current[timerId] = {};
          }
          notificationIds.current[timerId].completion = notificationId;
        }
      });
    }

    // Schedule halfway notification if enabled and not already triggered
    if (timer.halfwayAlert && !halfwayAlerts.current[timerId]) {
      const halfwayTime = timer.originalDuration / 2;
      const timeToHalfway = timer.remainingTime - halfwayTime;

      if (timeToHalfway > 0) {
        scheduleNotification(
          "Halfway Alert!",
          `${timer.name} is halfway done!`,
          timeToHalfway
        ).then((notificationId) => {
          if (notificationId) {
            if (!notificationIds.current[timerId]) {
              notificationIds.current[timerId] = {};
            }
            notificationIds.current[timerId].halfway = notificationId;
          }
        });
      }
    }

    // Reset halfway alert flag for this timer
    halfwayAlerts.current[timerId] = false;

    // Start the countdown
    timerRefs.current[timerId] = setInterval(() => {
      setTimers((prevTimers) => {
        const newTimers = prevTimers
          .map((timer) => {
            if (timer.id === timerId && timer.status === "running") {
              const newRemainingTime = timer.remainingTime - 1;

              // Check for halfway alert (in-app alert only, notification already scheduled)
              if (
                timer.halfwayAlert &&
                !halfwayAlerts.current[timerId] &&
                newRemainingTime <= timer.originalDuration / 2 &&
                newRemainingTime > 0
              ) {
                halfwayAlerts.current[timerId] = true;
                Alert.alert(
                  "Halfway Alert!",
                  `${timer.name} is halfway done! ${Math.floor(
                    newRemainingTime / 60
                  )}:${(newRemainingTime % 60)
                    .toString()
                    .padStart(2, "0")} remaining.`
                );
              }

              if (newRemainingTime <= 0) {
                // Timer completed
                clearInterval(timerRefs.current[timerId]);
                delete timerRefs.current[timerId];
                delete halfwayAlerts.current[timerId];
                delete notificationIds.current[timerId];

                const completedTimer = {
                  ...timer,
                  status: "completed" as const,
                  remainingTime: 0,
                };
                saveToHistory(completedTimer);
                Alert.alert("Timer Completed!", `${timer.name} has finished!`);

                // Remove completed timer from the list (it's already saved to history)
                return null;
              }

              return { ...timer, remainingTime: newRemainingTime };
            }
            return timer;
          })
          .filter((timer): timer is Timer => timer !== null);

        // Save updated timers
        AsyncStorage.setItem("timers", JSON.stringify(newTimers));
        return newTimers;
      });
    }, 1000);
  };

  const startTimer = (timerId: string) => {
    const updatedTimers = timers.map((timer) => {
      if (timer.id === timerId) {
        return { ...timer, status: "running" as const };
      }
      return timer;
    });
    saveTimers(updatedTimers);

    startTimerInterval(timerId);
  };

  const pauseTimer = (timerId: string) => {
    if (timerRefs.current[timerId]) {
      clearInterval(timerRefs.current[timerId]);
      delete timerRefs.current[timerId];
    }

    // Cancel scheduled notifications for this specific timer
    cancelTimerNotifications(timerId);

    const updatedTimers = timers.map((timer) => {
      if (timer.id === timerId) {
        return { ...timer, status: "paused" as const };
      }
      return timer;
    });
    saveTimers(updatedTimers);
  };

  const resetTimer = (timerId: string) => {
    if (timerRefs.current[timerId]) {
      clearInterval(timerRefs.current[timerId]);
      delete timerRefs.current[timerId];
    }

    // Cancel scheduled notifications and reset halfway alert for this specific timer
    cancelTimerNotifications(timerId);
    delete halfwayAlerts.current[timerId];

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
    saveTimers(updatedTimers);
  };

  const deleteTimer = (timerId: string) => {
    Alert.alert("Delete Timer", "Are you sure you want to delete this timer?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          // Clear any running interval for this timer
          if (timerRefs.current[timerId]) {
            clearInterval(timerRefs.current[timerId]);
            delete timerRefs.current[timerId];
          }

          // Clean up notifications and halfway alerts for this specific timer
          cancelTimerNotifications(timerId);
          delete halfwayAlerts.current[timerId];

          // Remove timer from the list
          const updatedTimers = timers.filter((timer) => timer.id !== timerId);
          saveTimers(updatedTimers);
        },
      },
    ]);
  };

  const bulkAction = (
    category: string,
    action: "start" | "pause" | "reset"
  ) => {
    const categoryTimers = timers.filter(
      (timer) => timer.category === category && timer.status !== "completed"
    );

    categoryTimers.forEach((timer) => {
      switch (action) {
        case "start":
          if (timer.status !== "running" && timer.status !== "completed") {
            startTimer(timer.id);
          }
          break;
        case "pause":
          if (timer.status === "running") {
            pauseTimer(timer.id);
          }
          break;
        case "reset":
          resetTimer(timer.id);
          break;
      }
    });
  };

  const applyFilter = async (filter: string) => {
    try {
      await AsyncStorage.setItem("categoryFilter", filter);
      setCategoryFilter(filter);
      setShowFilterDropdown(false);
    } catch (error) {
      console.error("Failed to save filter:", error);
    }
  };

  const clearFilter = async () => {
    try {
      await AsyncStorage.removeItem("categoryFilter");
      setCategoryFilter("All");
      setShowFilterDropdown(false);
    } catch (error) {
      console.error("Failed to clear filter:", error);
    }
  };

  const getAvailableCategories = () => {
    const categories = [...new Set(timers.map((timer) => timer.category))];
    return categories;
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((cat) => cat !== category)
        : [...prev, category]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = (timer: Timer) => {
    return (
      ((timer.originalDuration - timer.remainingTime) /
        timer.originalDuration) *
      100
    );
  };

  // Group timers by category and apply filter
  const filteredTimers =
    categoryFilter === "All"
      ? timers
      : timers.filter((timer) => timer.category === categoryFilter);

  const groupedTimers = filteredTimers.reduce((acc, timer) => {
    if (!acc[timer.category]) {
      acc[timer.category] = [];
    }
    acc[timer.category].push(timer);
    return acc;
  }, {} as { [key: string]: Timer[] });

  useFocusEffect(
    useCallback(() => {
      loadTimers();
      requestNotificationPermissions();
    }, [])
  );

  useEffect(() => {
    return () => {
      // Cleanup intervals on unmount
      Object.values(timerRefs.current).forEach(clearInterval);
      // Cleanup all notifications on unmount
      Object.keys(notificationIds.current).forEach((timerId) => {
        cancelTimerNotifications(timerId);
      });
    };
  }, []);

  if (Object.keys(groupedTimers).length === 0) {
    return (
      <View style={styles.container}>
        {/* Filter Dropdown Toggle */}
        <View style={styles.filterSection}>
          <Pressable
            style={styles.filterToggle}
            onPress={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <Ionicons name="funnel" size={16} color="#ffffff" />
            <Text style={styles.filterToggleText}>
              {categoryFilter === "All" ? "All Categories" : categoryFilter}
            </Text>
            <Ionicons
              name={showFilterDropdown ? "chevron-up" : "chevron-down"}
              size={14}
              color="#ffffff"
            />
          </Pressable>

          {/* Notification Permission Status */}
          {!notificationPermission && (
            <Pressable
              style={styles.notificationWarning}
              onPress={requestNotificationPermissions}
            >
              <Ionicons name="notifications-off" size={14} color="#ff6b6b" />
              <Text style={styles.notificationWarningText}>
                Tap to enable notifications for timer alerts
              </Text>
            </Pressable>
          )}

          {/* Filter Dropdown */}
          {showFilterDropdown && (
            <>
              {/* Backdrop */}
              <Pressable
                style={styles.backdrop}
                onPress={() => setShowFilterDropdown(false)}
              />
              <View style={styles.filterDropdown}>
                <Pressable
                  style={[
                    styles.filterOption,
                    categoryFilter === "All" && styles.filterOptionSelected,
                  ]}
                  onPress={() => applyFilter("All")}
                >
                  <Ionicons
                    name="list"
                    size={14}
                    color={categoryFilter === "All" ? "#000000" : "#ffffff"}
                  />
                  <Text
                    style={[
                      styles.filterOptionText,
                      categoryFilter === "All" &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    All Categories
                  </Text>
                  {categoryFilter === "All" && (
                    <Ionicons name="checkmark" size={14} color="#000000" />
                  )}
                </Pressable>

                {getAvailableCategories().map((category) => (
                  <Pressable
                    key={category}
                    style={[
                      styles.filterOption,
                      categoryFilter === category &&
                        styles.filterOptionSelected,
                    ]}
                    onPress={() => applyFilter(category)}
                  >
                    <Ionicons
                      name="pricetag"
                      size={14}
                      color={
                        categoryFilter === category ? "#000000" : "#ffffff"
                      }
                    />
                    <Text
                      style={[
                        styles.filterOptionText,
                        categoryFilter === category &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                    {categoryFilter === category && (
                      <Ionicons name="checkmark" size={14} color="#000000" />
                    )}
                  </Pressable>
                ))}

                {categoryFilter !== "All" && (
                  <Pressable
                    style={styles.clearFilterOption}
                    onPress={clearFilter}
                  >
                    <Ionicons name="close" size={14} color="#ff6b6b" />
                    <Text style={styles.clearFilterText}>Clear Filter</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>

        <Text style={styles.emptyText}>
          {categoryFilter === "All"
            ? "No timers yet!"
            : `No timers in "${categoryFilter}" category`}
        </Text>
        <Text style={styles.emptySubText}>
          {categoryFilter === "All"
            ? "Tap the + button to create your first timer"
            : "Clear the filter or add timers to this category"}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Filter Dropdown Toggle */}
      <View style={styles.filterSection}>
        <Pressable
          style={styles.filterToggle}
          onPress={() => setShowFilterDropdown(!showFilterDropdown)}
        >
          <Ionicons name="funnel" size={16} color="#ffffff" />
          <Text style={styles.filterToggleText}>
            {categoryFilter === "All" ? "All Categories" : categoryFilter}
          </Text>
          <Ionicons
            name={showFilterDropdown ? "chevron-up" : "chevron-down"}
            size={14}
            color="#ffffff"
          />
        </Pressable>

        {/* Notification Permission Status */}
        {!notificationPermission && (
          <Pressable
            style={styles.notificationWarning}
            onPress={requestNotificationPermissions}
          >
            <Ionicons name="notifications-off" size={14} color="#ff6b6b" />
            <Text style={styles.notificationWarningText}>
              Tap to enable notifications for timer alerts
            </Text>
          </Pressable>
        )}

        {/* Filter Dropdown */}
        {showFilterDropdown && (
          <>
            {/* Backdrop */}
            <Pressable
              style={styles.backdrop}
              onPress={() => setShowFilterDropdown(false)}
            />
            <View style={styles.filterDropdown}>
              <Pressable
                style={[
                  styles.filterOption,
                  categoryFilter === "All" && styles.filterOptionSelected,
                ]}
                onPress={() => applyFilter("All")}
              >
                <Ionicons
                  name="list"
                  size={14}
                  color={categoryFilter === "All" ? "#000000" : "#ffffff"}
                />
                <Text
                  style={[
                    styles.filterOptionText,
                    categoryFilter === "All" && styles.filterOptionTextSelected,
                  ]}
                >
                  All Categories
                </Text>
                {categoryFilter === "All" && (
                  <Ionicons name="checkmark" size={14} color="#000000" />
                )}
              </Pressable>

              {getAvailableCategories().map((category) => (
                <Pressable
                  key={category}
                  style={[
                    styles.filterOption,
                    categoryFilter === category && styles.filterOptionSelected,
                  ]}
                  onPress={() => applyFilter(category)}
                >
                  <Ionicons
                    name="pricetag"
                    size={14}
                    color={categoryFilter === category ? "#000000" : "#ffffff"}
                  />
                  <Text
                    style={[
                      styles.filterOptionText,
                      categoryFilter === category &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                  {categoryFilter === category && (
                    <Ionicons name="checkmark" size={14} color="#000000" />
                  )}
                </Pressable>
              ))}

              {categoryFilter !== "All" && (
                <Pressable
                  style={styles.clearFilterOption}
                  onPress={clearFilter}
                >
                  <Ionicons name="close" size={14} color="#ff6b6b" />
                  <Text style={styles.clearFilterText}>Clear Filter</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>

      {Object.entries(groupedTimers).map(([category, categoryTimers]) => (
        <View key={category} style={styles.categoryContainer}>
          <Pressable
            style={styles.categoryHeader}
            onPress={() => toggleCategory(category)}
          >
            <View style={styles.categoryHeaderContent}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <Text style={styles.categoryCount}>
                ({categoryTimers.length})
              </Text>
            </View>
            <Ionicons
              name={
                collapsedCategories.includes(category)
                  ? "chevron-down"
                  : "chevron-up"
              }
              size={16}
              color="#ffffff"
              style={styles.chevronIcon}
            />
          </Pressable>

          <View style={styles.bulkActions}>
            <Pressable
              style={styles.bulkButton}
              onPress={() => bulkAction(category, "start")}
            >
              <Text style={styles.bulkButtonText}>Start All</Text>
            </Pressable>
            <Pressable
              style={styles.bulkButton}
              onPress={() => bulkAction(category, "pause")}
            >
              <Text style={styles.bulkButtonText}>Pause All</Text>
            </Pressable>
            <Pressable
              style={styles.bulkButton}
              onPress={() => bulkAction(category, "reset")}
            >
              <Text style={styles.bulkButtonText}>Reset All</Text>
            </Pressable>
          </View>

          {!collapsedCategories.includes(category) && (
            <View style={styles.timersContainer}>
              {categoryTimers.map((timer) => (
                <View key={timer.id} style={styles.timerCard}>
                  <View style={styles.timerHeader}>
                    <View style={styles.timerInfo}>
                      <View style={styles.timerNameContainer}>
                        <Text style={styles.timerName}>{timer.name}</Text>
                        {timer.halfwayAlert && (
                          <Ionicons
                            name="notifications"
                            size={14}
                            color="#888888"
                            style={styles.alertIcon}
                          />
                        )}
                      </View>
                      <Text style={styles.timerTime}>
                        {formatTime(timer.remainingTime)}
                      </Text>
                    </View>
                    <Text style={styles.timerStatus}>{timer.status}</Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${getProgressPercentage(timer)}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.timerControls}>
                    {timer.status === "stopped" || timer.status === "paused" ? (
                      <Pressable
                        style={[styles.controlButton, styles.startButton]}
                        onPress={() => startTimer(timer.id)}
                      >
                        <Ionicons name="play" size={12} color="#000000" />
                        <Text style={styles.controlButtonText}>Start</Text>
                      </Pressable>
                    ) : timer.status === "running" ? (
                      <Pressable
                        style={[styles.controlButton, styles.pauseButton]}
                        onPress={() => pauseTimer(timer.id)}
                      >
                        <Ionicons name="pause" size={12} color="#000000" />
                        <Text style={styles.controlButtonText}>Pause</Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      style={[styles.controlButton, styles.resetButton]}
                      onPress={() => resetTimer(timer.id)}
                    >
                      <Ionicons name="refresh" size={12} color="#000000" />
                      <Text style={styles.controlButtonText}>Reset</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.controlButton, styles.deleteButton]}
                      onPress={() => deleteTimer(timer.id)}
                    >
                      <Ionicons name="trash" size={12} color="#ffffff" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#000000",
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 50,
    color: "#ffffff",
  },
  emptySubText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    color: "#888888",
  },
  categoryContainer: {
    marginBottom: 16,
    backgroundColor: "#000000",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#333333",
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#000000",
  },
  categoryHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginRight: 8,
  },
  categoryCount: {
    fontSize: 12,
    color: "#888888",
    backgroundColor: "#333333",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: "500",
  },
  chevronIcon: {
    opacity: 0.8,
  },
  bulkActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "#000000",
  },
  bulkButton: {
    backgroundColor: "#333333",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#555555",
  },
  bulkButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "500",
  },
  timersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: "#000000",
  },
  timerCard: {
    backgroundColor: "#000000",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333333",
  },
  timerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  timerInfo: {
    flex: 1,
  },
  timerNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  timerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginRight: 8,
  },
  alertIcon: {
    marginLeft: 4,
  },
  timerTime: {
    fontSize: 20,
    fontWeight: "300",
    color: "#ffffff",
    fontFamily: "monospace",
  },
  timerStatus: {
    fontSize: 11,
    color: "#aaaaaa",
    textTransform: "capitalize",
    backgroundColor: "#333333",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontWeight: "500",
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "#333333",
    borderRadius: 2,
    marginVertical: 12,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 2,
  },
  timerControls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    justifyContent: "center",
    gap: 4,
  },
  startButton: {
    backgroundColor: "#ffffff",
  },
  pauseButton: {
    backgroundColor: "#888888",
  },
  resetButton: {
    backgroundColor: "#666666",
  },
  deleteButton: {
    backgroundColor: "#444444",
  },
  controlButtonText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  filterIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  filterText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  filterSection: {
    marginBottom: 16,
    position: "relative",
    zIndex: 1000,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: -16,
    right: -16,
    bottom: -1000,
    zIndex: 999,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "#333333",
  },
  filterToggleText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  filterDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#333333",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  filterOptionSelected: {
    backgroundColor: "#ffffff",
  },
  filterOptionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  filterOptionTextSelected: {
    color: "#000000",
    fontWeight: "600",
  },
  clearFilterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#2a1a1a",
    borderTopWidth: 1,
    borderTopColor: "#444444",
  },
  clearFilterText: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  notificationWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a1a1a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#ff6b6b",
  },
  notificationWarningText: {
    color: "#ff6b6b",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
});
