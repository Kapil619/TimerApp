import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useToast } from "@/contexts/ToastContext";
import { NotificationManager } from "@/utils/notificationManager";
import { StorageManager } from "@/utils/storageManager";
import { indexStyles } from "@/utils/styles";
import { TimerManager } from "@/utils/timerManager";
import { Timer } from "@/utils/types";

export default function TimersScreen() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const { showToast } = useToast();

  // Initialize managers
  const timerManager = new TimerManager(setTimers, showToast);
  const notificationManager = NotificationManager.getInstance();

  const requestNotificationPermissions = async () => {
    const hasPermission =
      await notificationManager.requestNotificationPermissions();
    setNotificationPermission(hasPermission);

    if (!hasPermission) {
      showToast("⚠️ Enable notifications in settings for timer alerts");
    }

    return hasPermission;
  };

  const loadTimers = async () => {
    try {
      const loadedTimers = await StorageManager.loadTimers();
      setTimers(loadedTimers);

      // Restart intervals for running timers
      timerManager.restartRunningTimers(loadedTimers);

      // Set all categories as collapsed by default
      const categories = timerManager.getAvailableCategories(loadedTimers);
      setCollapsedCategories(categories);

      // Load category filter
      const savedFilter = await StorageManager.loadCategoryFilter();
      setCategoryFilter(savedFilter);
    } catch (error) {
      console.error("Failed to load timers:", error);
    }
  };

  const startTimer = async (timerId: string) => {
    const updatedTimers = await timerManager.startTimer(timerId, timers);
    setTimers(updatedTimers);
  };

  const pauseTimer = async (timerId: string) => {
    const updatedTimers = await timerManager.pauseTimer(timerId, timers);
    setTimers(updatedTimers);
  };

  const resetTimer = async (timerId: string) => {
    const updatedTimers = await timerManager.resetTimer(timerId, timers);
    setTimers(updatedTimers);
  };

  const deleteTimer = (timerId: string) => {
    Alert.alert("Delete Timer", "Are you sure you want to delete this timer?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updatedTimers = await timerManager.deleteTimer(timerId, timers);
          setTimers(updatedTimers);
        },
      },
    ]);
  };

  const bulkAction = async (
    category: string,
    action: "start" | "pause" | "reset"
  ) => {
    const updatedTimers = await timerManager.bulkAction(
      category,
      action,
      timers
    );
    setTimers(updatedTimers);
  };

  const applyFilter = async (filter: string) => {
    try {
      await StorageManager.saveCategoryFilter(filter);
      setCategoryFilter(filter);
      setShowFilterDropdown(false);
    } catch (error) {
      console.error("Failed to save filter:", error);
    }
  };

  const clearFilter = async () => {
    try {
      await StorageManager.clearCategoryFilter();
      setCategoryFilter("All");
      setShowFilterDropdown(false);
    } catch (error) {
      console.error("Failed to clear filter:", error);
    }
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((cat) => cat !== category)
        : [...prev, category]
    );
  };

  // Group timers by category and apply filter
  const filteredTimers = timerManager.filterTimersByCategory(
    timers,
    categoryFilter
  );
  const groupedTimers = timerManager.groupTimersByCategory(filteredTimers);

  useFocusEffect(
    useCallback(() => {
      loadTimers();
      requestNotificationPermissions();
    }, [])
  );

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      timerManager.cleanup();
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

                {timerManager.getAvailableCategories(timers).map((category) => (
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

              {timerManager.getAvailableCategories(timers).map((category) => (
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
                        {timerManager.formatTime(timer.remainingTime)}
                      </Text>
                    </View>
                    <Text style={indexStyles.timerStatus}>{timer.status}</Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={indexStyles.progressBarContainer}>
                    <View
                      style={[
                        indexStyles.progressBar,
                        {
                          width: `${timerManager.getProgressPercentage(
                            timer
                          )}%`,
                        },
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
