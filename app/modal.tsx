import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";

import { Text, View } from "@/components/Themed";

interface Timer {
  id: string;
  name: string;
  duration: number; // in seconds
  category: string;
  status: "stopped" | "running" | "paused" | "completed";
  remainingTime: number;
  originalDuration: number;
  halfwayAlert: boolean;
}

const CATEGORIES = ["Workout", "Study", "Break", "Other"];

export default function AddTimerModal() {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [category, setCategory] = useState("Other");
  const [halfwayAlert, setHalfwayAlert] = useState(false);

  const saveTimer = async () => {
    if (!name.trim() || !duration.trim() || !category.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const durationInSeconds = parseInt(duration);
    if (isNaN(durationInSeconds) || durationInSeconds <= 0) {
      Alert.alert("Error", "Please enter a valid duration in seconds");
      return;
    }

    const newTimer: Timer = {
      id: Date.now().toString(),
      name: name.trim(),
      duration: durationInSeconds,
      category: category.trim(),
      status: "stopped",
      remainingTime: durationInSeconds,
      originalDuration: durationInSeconds,
      halfwayAlert,
    };

    try {
      const existingTimers = await AsyncStorage.getItem("timers");
      const timers = existingTimers ? JSON.parse(existingTimers) : [];
      timers.push(newTimer);
      await AsyncStorage.setItem("timers", JSON.stringify(timers));

      Alert.alert("Success", "Timer created successfully!");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to save timer");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Add New Timer</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Timer Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Workout Timer"
            placeholderTextColor="#666666"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Duration (seconds)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            placeholder="e.g., 300"
            placeholderTextColor="#666666"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonSelected,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    category === cat && styles.categoryButtonTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={saveTimer}>
            <Text style={styles.buttonText}>Save Timer</Text>
          </Pressable>
        </View>
      </View>

      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#000000",
  },
  formContainer: {
    flex: 1,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
    color: "#ffffff",
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#ffffff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#111111",
    color: "#ffffff",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 40,
    gap: 16,
  },
  button: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flex: 1,
    alignItems: "center",
  },
  buttonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#333333",
    backgroundColor: "#111111",
    alignItems: "center",
    minWidth: 80,
  },
  categoryButtonSelected: {
    borderColor: "#FFFFFF",
    backgroundColor: "#333333",
  },
  categoryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  categoryButtonTextSelected: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
