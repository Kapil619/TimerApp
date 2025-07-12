import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
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
        <View style={styles.headerButtons}>
          <Pressable style={styles.clearButton} onPress={clearHistory}>
            <Text style={styles.buttonText}>Clear</Text>
          </Pressable>
        </View>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 10,
  },
  clearButton: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: "#000000",
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
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333333",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  historyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    flex: 1,
  },
  historyCategory: {
    fontSize: 12,
    color: "#cccccc",
    backgroundColor: "#333333",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontWeight: "500",
  },
  historyDuration: {
    fontSize: 14,
    color: "#ffffff",
    marginBottom: 6,
  },
  historyDate: {
    fontSize: 12,
    color: "#888888",
  },
});
