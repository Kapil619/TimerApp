import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";

interface HistoryItem {
  id: string;
  name: string;
  category: string;
  completedAt: string;
  originalDuration: number;
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem("timerHistory");
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        // Sort by completion time, newest first
        setHistory(
          parsedHistory.sort(
            (a: HistoryItem, b: HistoryItem) =>
              new Date(b.completedAt).getTime() -
              new Date(a.completedAt).getTime()
          )
        );
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  const clearHistory = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear all timer history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("timerHistory");
              setHistory([]);
              Alert.alert("Success", "History cleared successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to clear history");
            }
          },
        },
      ]
    );
  };

  const exportHistory = async () => {
    if (history.length === 0) {
      Alert.alert("No Data", "No timer history to export");
      return;
    }

    try {
      // Create formatted export data
      const exportData = {
        exportDate: new Date().toISOString(),
        totalTimers: history.length,
        timers: history.map((item) => ({
          name: item.name,
          category: item.category,
          duration: item.originalDuration,
          durationFormatted: formatDuration(item.originalDuration),
          completedAt: item.completedAt,
          completedAtFormatted: formatDate(item.completedAt),
        })),
        summary: {
          totalTimeSpent: history.reduce(
            (sum, item) => sum + item.originalDuration,
            0
          ),
          categoriesSummary: history.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      };

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `timer-history-${timestamp}.json`;
      const fileUri = FileSystem.documentDirectory + filename;

      // Write JSON file
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(exportData, null, 2)
      );

      // Show success feedback to user
      Alert.alert(
        "Export Successful!",
        `Timer history has been exported successfully.\n\nFile: ${filename}\nLocation: Documents folder\n\nTotal timers: ${history.length}`,
        [{ text: "OK", style: "default" }]
      );
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert(
        "Export Failed",
        "Failed to export timer history. Please try again."
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  if (history.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No completed timers yet!</Text>
        <Text style={styles.emptySubText}>
          Complete some timers to see them here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Completed Timers ({history.length})</Text>
      </View>

      <View style={styles.actionButtons}>
        <Pressable style={styles.exportButton} onPress={exportHistory}>
          <Ionicons name="download-outline" size={16} color="#ffffff" />
          <Text style={styles.buttonText}>Export JSON</Text>
        </Pressable>
        <Pressable style={styles.clearButton} onPress={clearHistory}>
          <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
          <Text style={styles.clearButtonText}>Clear All</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView}>
        {history.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyName}>{item.name}</Text>
              <Text style={styles.historyCategory}>{item.category}</Text>
            </View>
            <Text style={styles.historyDuration}>
              Duration: {formatDuration(item.originalDuration)}
            </Text>
            <Text style={styles.historyDate}>
              Completed: {formatDate(item.completedAt)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 10,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ff6b6b",
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  clearButtonText: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
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
  historyCard: {
    backgroundColor: "#111111",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  historyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    flex: 1,
    marginRight: 12,
  },
  historyCategory: {
    fontSize: 12,
    color: "#ffffff",
    backgroundColor: "#333333",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  historyDuration: {
    fontSize: 15,
    color: "#ffffff",
    marginBottom: 8,
    fontWeight: "500",
  },
  historyDate: {
    fontSize: 13,
    color: "#999999",
    fontWeight: "400",
  },
});
