import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { ToastOptions } from "@/utils/types";

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void;
  hideToast: () => void;
}

interface ToastState {
  message: string;
  visible: boolean;
  duration: number;
  position: "top" | "bottom";
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toastState, setToastState] = useState<ToastState>({
    message: "",
    visible: false,
    duration: 2000,
    position: "top",
  });

  const toastAnimation = useRef(new Animated.Value(0)).current;

  const showToast = (message: string, options: ToastOptions = {}) => {
    setToastState({
      message,
      visible: true,
      duration: options.duration || 2000,
      position: options.position || "top",
    });
  };

  const hideToast = () => {
    setToastState((prev) => ({
      ...prev,
      visible: false,
      message: "",
    }));
  };

  useEffect(() => {
    if (toastState.visible) {
      // Animate in
      Animated.sequence([
        Animated.timing(toastAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(toastState.duration),
        Animated.timing(toastAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        hideToast();
      });
    }
  }, [toastState.visible, toastAnimation, toastState.duration]);

  const contextValue: ToastContextType = {
    showToast,
    hideToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toastState.visible && (
        <Animated.View
          style={[
            styles.toast,
            toastState.position === "bottom"
              ? styles.toastBottom
              : styles.toastTop,
            {
              opacity: toastAnimation,
              transform: [
                {
                  translateY: toastAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange:
                      toastState.position === "bottom" ? [20, 0] : [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastState.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#333333",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#555555",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  toastTop: {
    top: 60,
  },
  toastBottom: {
    bottom: 100,
  },
  toastText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});
