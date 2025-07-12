import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
} from "react-native";

import { useToast } from "@/contexts/ToastContext";
import { modalStyles } from "@/utils/styles";
import { Text, View } from "react-native";
import { Timer, StorageManager } from "@/utils/storageManager";

const CATEGORIES = ["Workout", "Study", "Break", "Other"];

export default function AddTimerModal() {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [category, setCategory] = useState("Other");
  const [halfwayAlert, setHalfwayAlert] = useState(false);
  const { showToast } = useToast();

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
      const existingTimers = await StorageManager.loadTimers();
      const timers = [...existingTimers, newTimer];
      await StorageManager.saveTimers(timers);

      showToast("✅ Timer created successfully!", { duration: 1500 });
      setTimeout(() => {
        router.back();
      }, 2300); // Slightly longer than toast duration
    } catch (error) {
      Alert.alert("Error", "Failed to save timer");
    }
  };

  return (
    <ScrollView style={modalStyles.container}>
      <View style={modalStyles.formContainer}>
        <Text style={modalStyles.title}>Add New Timer</Text>

        <View style={modalStyles.inputContainer}>
          <Text style={modalStyles.label}>Timer Name</Text>
          <TextInput
            style={modalStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Workout Timer"
            placeholderTextColor="#666666"
          />
        </View>

        <View style={modalStyles.inputContainer}>
          <Text style={modalStyles.label}>Duration (seconds)</Text>
          <TextInput
            style={modalStyles.input}
            value={duration}
            onChangeText={setDuration}
            placeholder="e.g., 300"
            placeholderTextColor="#666666"
            keyboardType="numeric"
          />
        </View>

        <View style={modalStyles.inputContainer}>
          <Text style={modalStyles.label}>Category</Text>
          <View style={modalStyles.categoryContainer}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  modalStyles.categoryButton,
                  category === cat && modalStyles.categoryButtonSelected,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    modalStyles.categoryButtonText,
                    category === cat && modalStyles.categoryButtonTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={modalStyles.inputContainer}>
          <View style={modalStyles.switchContainer}>
            <View style={modalStyles.switchLabelContainer}>
              <Text style={modalStyles.label}>Halfway Alert</Text>
              <Text style={modalStyles.switchDescription}>
                Get notified when 50% of timer duration is reached
              </Text>
            </View>
            <Switch
              value={halfwayAlert}
              onValueChange={setHalfwayAlert}
              trackColor={{ false: "#333333", true: "#666666" }}
              thumbColor={halfwayAlert ? "#ffffff" : "#888888"}
              ios_backgroundColor="#333333"
            />
          </View>
        </View>

        <View style={modalStyles.buttonContainer}>
          <Pressable style={modalStyles.button} onPress={() => router.back()}>
            <Text style={modalStyles.buttonText}>Cancel</Text>
          </Pressable>
          <Pressable style={modalStyles.button} onPress={saveTimer}>
            <Text style={modalStyles.buttonText}>Save Timer</Text>
          </Pressable>
        </View>
      </View>

      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </ScrollView>
  );
}
