import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView } from "react-native";

import { useToast } from "@/contexts/ToastContext";
import { indexStyles } from "@/utils/styles";
import { Text, View } from "react-native";

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
  const { showToast } = useToast();
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
        showToast("⚠️ Enable notifications in settings for timer alerts");
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
                setTimeout(() => {
                  showToast(
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
                setTimeout(() => {
                  showToast(`🎉 ${timer.name} completed!`);
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
      <View style={indexStyles.container}>
        {/* Filter Dropdown Toggle */}
        <View style={indexStyles.filterSection}>
          <Pressable
            style={indexStyles.filterToggle}
            onPress={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <Ionicons name="funnel" size={16} color="#ffffff" />
            <Text style={indexStyles.filterToggleText}>
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
              style={indexStyles.notificationWarning}
              onPress={requestNotificationPermissions}
            >
              <Ionicons name="notifications-off" size={14} color="#ff6b6b" />
              <Text style={indexStyles.notificationWarningText}>
                Tap to enable notifications for timer alerts
              </Text>
            </Pressable>
          )}

          {/* Filter Dropdown */}
          {showFilterDropdown && (
            <>
              {/* Backdrop */}
              <Pressable
                style={indexStyles.backdrop}
                onPress={() => setShowFilterDropdown(false)}
              />
              <View style={indexStyles.filterDropdown}>
                <Pressable
                  style={[
                    indexStyles.filterOption,
                    categoryFilter === "All" &&
                      indexStyles.filterOptionSelected,
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
                      indexStyles.filterOptionText,
                      categoryFilter === "All" &&
                        indexStyles.filterOptionTextSelected,
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
                      indexStyles.filterOption,
                      categoryFilter === category &&
                        indexStyles.filterOptionSelected,
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
                        indexStyles.filterOptionText,
                        categoryFilter === category &&
                          indexStyles.filterOptionTextSelected,
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
                    style={indexStyles.clearFilterOption}
                    onPress={clearFilter}
                  >
                    <Ionicons name="close" size={14} color="#ff6b6b" />
                    <Text style={indexStyles.clearFilterText}>
                      Clear Filter
                    </Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>

        <Text style={indexStyles.emptyText}>
          {categoryFilter === "All"
            ? "No timers yet!"
            : `No timers in "${categoryFilter}" category`}
        </Text>
        <Text style={indexStyles.emptySubText}>
          {categoryFilter === "All"
            ? "Tap the + button to create your first timer"
            : "Clear the filter or add timers to this category"}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={indexStyles.container}>
      {/* Filter Dropdown Toggle */}
      <View style={indexStyles.filterSection}>
        <Pressable
          style={indexStyles.filterToggle}
          onPress={() => setShowFilterDropdown(!showFilterDropdown)}
        >
          <Ionicons name="funnel" size={16} color="#ffffff" />
          <Text style={indexStyles.filterToggleText}>
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
            style={indexStyles.notificationWarning}
            onPress={requestNotificationPermissions}
          >
            <Ionicons name="notifications-off" size={14} color="#ff6b6b" />
            <Text style={indexStyles.notificationWarningText}>
              Tap to enable notifications for timer alerts
            </Text>
          </Pressable>
        )}

        {/* Filter Dropdown */}
        {showFilterDropdown && (
          <>
            {/* Backdrop */}
            <Pressable
              style={indexStyles.backdrop}
              onPress={() => setShowFilterDropdown(false)}
            />
            <View style={indexStyles.filterDropdown}>
              <Pressable
                style={[
                  indexStyles.filterOption,
                  categoryFilter === "All" && indexStyles.filterOptionSelected,
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
                    indexStyles.filterOptionText,
                    categoryFilter === "All" &&
                      indexStyles.filterOptionTextSelected,
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
                    indexStyles.filterOption,
                    categoryFilter === category &&
                      indexStyles.filterOptionSelected,
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
                      indexStyles.filterOptionText,
                      categoryFilter === category &&
                        indexStyles.filterOptionTextSelected,
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
                  style={indexStyles.clearFilterOption}
                  onPress={clearFilter}
                >
                  <Ionicons name="close" size={14} color="#ff6b6b" />
                  <Text style={indexStyles.clearFilterText}>Clear Filter</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>

      {Object.entries(groupedTimers).map(([category, categoryTimers]) => (
        <View key={category} style={indexStyles.categoryContainer}>
          <Pressable
            style={indexStyles.categoryHeader}
            onPress={() => toggleCategory(category)}
          >
            <View style={indexStyles.categoryHeaderContent}>
              <Text style={indexStyles.categoryTitle}>{category}</Text>
              <Text style={indexStyles.categoryCount}>
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
              style={indexStyles.chevronIcon}
            />
          </Pressable>

          <View style={indexStyles.bulkActions}>
            <Pressable
              style={indexStyles.bulkButton}
              onPress={() => bulkAction(category, "start")}
            >
              <Text style={indexStyles.bulkButtonText}>Start All</Text>
            </Pressable>
            <Pressable
              style={indexStyles.bulkButton}
              onPress={() => bulkAction(category, "pause")}
            >
              <Text style={indexStyles.bulkButtonText}>Pause All</Text>
            </Pressable>
            <Pressable
              style={indexStyles.bulkButton}
              onPress={() => bulkAction(category, "reset")}
            >
              <Text style={indexStyles.bulkButtonText}>Reset All</Text>
            </Pressable>
          </View>

          {!collapsedCategories.includes(category) && (
            <View style={indexStyles.timersContainer}>
              {categoryTimers.map((timer) => (
                <View key={timer.id} style={indexStyles.timerCard}>
                  <View style={indexStyles.timerHeader}>
                    <View style={indexStyles.timerInfo}>
                      <View style={indexStyles.timerNameContainer}>
                        <Text style={indexStyles.timerName}>{timer.name}</Text>
                        {timer.halfwayAlert && (
                          <Ionicons
                            name="notifications"
                            size={14}
                            color="#888888"
                            style={indexStyles.alertIcon}
                          />
                        )}
                      </View>
                      <Text style={indexStyles.timerTime}>
                        {formatTime(timer.remainingTime)}
                      </Text>
                    </View>
                    <Text style={indexStyles.timerStatus}>{timer.status}</Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={indexStyles.progressBarContainer}>
                    <View
                      style={[
                        indexStyles.progressBar,
                        { width: `${getProgressPercentage(timer)}%` },
                      ]}
                    />
                  </View>

                  <View style={indexStyles.timerControls}>
                    {timer.status === "stopped" || timer.status === "paused" ? (
                      <Pressable
                        style={[
                          indexStyles.controlButton,
                          indexStyles.startButton,
                        ]}
                        onPress={() => startTimer(timer.id)}
                      >
                        <Ionicons name="play" size={12} color="#000000" />
                        <Text style={indexStyles.controlButtonText}>Start</Text>
                      </Pressable>
                    ) : timer.status === "running" ? (
                      <Pressable
                        style={[
                          indexStyles.controlButton,
                          indexStyles.pauseButton,
                        ]}
                        onPress={() => pauseTimer(timer.id)}
                      >
                        <Ionicons name="pause" size={12} color="#000000" />
                        <Text style={indexStyles.controlButtonText}>Pause</Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      style={[
                        indexStyles.controlButton,
                        indexStyles.resetButton,
                      ]}
                      onPress={() => resetTimer(timer.id)}
                    >
                      <Ionicons name="refresh" size={12} color="#000000" />
                      <Text style={indexStyles.controlButtonText}>Reset</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        indexStyles.controlButton,
                        indexStyles.deleteButton,
                      ]}
                      onPress={() => deleteTimer(timer.id)}
                    >
                      <Ionicons name="trash" size={12} color="#ffffff" />
                      <Text style={indexStyles.deleteButtonText}>Delete</Text>
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
