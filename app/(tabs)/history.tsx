import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView } from "react-native";
import { StorageManager } from "@/utils/storageManager";
import { historyStyles } from "@/utils/styles";
import { Text, View } from "react-native";
import { HistoryItem, ExportData, CategorySummary } from "@/utils/types";

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = async () => {
    try {
      const parsedHistory = await StorageManager.loadHistory();
      // Sort by completion time, newest first
      setHistory(
        parsedHistory.sort(
          (a: HistoryItem, b: HistoryItem) =>
            new Date(b.completedAt).getTime() -
            new Date(a.completedAt).getTime()
        )
      );
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
              await StorageManager.clearHistory();
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
      <View style={historyStyles.container}>
        <Text style={historyStyles.emptyText}>No completed timers yet!</Text>
        <Text style={historyStyles.emptySubText}>
          Complete some timers to see them here
        </Text>
      </View>
    );
  }

  return (
    <View style={historyStyles.container}>
      <View style={historyStyles.header}>
        <Text style={historyStyles.title}>
          Completed Timers ({history.length})
        </Text>
      </View>

      <View style={historyStyles.actionButtons}>
        <Pressable style={historyStyles.exportButton} onPress={exportHistory}>
          <Ionicons name="download-outline" size={16} color="#ffffff" />
          <Text style={historyStyles.buttonText}>Export JSON</Text>
        </Pressable>
        <Pressable style={historyStyles.clearButton} onPress={clearHistory}>
          <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
          <Text style={historyStyles.clearButtonText}>Clear All</Text>
        </Pressable>
      </View>

      <ScrollView style={historyStyles.scrollView}>
        {history.map((item) => (
          <View key={item.id} style={historyStyles.historyCard}>
            <View style={historyStyles.historyHeader}>
              <Text style={historyStyles.historyName}>{item.name}</Text>
              <Text style={historyStyles.historyCategory}>{item.category}</Text>
            </View>
            <Text style={historyStyles.historyDuration}>
              Duration: {formatDuration(item.originalDuration)}
            </Text>
            <Text style={historyStyles.historyDate}>
              Completed: {formatDate(item.completedAt)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
