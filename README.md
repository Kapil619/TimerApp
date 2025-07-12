# Timer App

A React Native timer application built with Expo that allows users to create, manage, and track multiple customizable timers with category-based organization.

## Features

### Core Features

- **Add Timer**: Create new timers with name, duration (in seconds), and category
- **Timer Management**: Start, pause, and reset individual timers
- **Category Grouping**: Timers are automatically grouped by categories with expandable/collapsible sections
- **Progress Visualization**: Visual progress bars show remaining time relative to total duration
- **Bulk Actions**: Start, pause, or reset all timers in a category at once
- **Timer History**: View completed timers with completion timestamps
- **Data Persistence**: All timer data is stored locally using AsyncStorage

### Enhanced Features

- **Status Tracking**: Real-time status updates (stopped, running, paused, completed)
- **Completion Alerts**: Modal notifications when timers complete
- **History Management**: Clear timer history functionality
- **Clean UI**: Modern, responsive design with proper spacing and shadows

## Tech Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and toolchain
- **TypeScript**: Type-safe development
- **AsyncStorage**: Local data persistence
- **React Navigation**: Tab-based navigation

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- Expo Go app on your mobile device

## Installation & Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd TimerApp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm start
   # or
   npx expo start
   ```

4. **Run on your device**
   - Install the Expo Go app on your mobile device
   - Scan the QR code displayed in the terminal/browser
   - The app will load on your device

## Usage

### Creating a Timer

1. Tap the "+" button in the top-right corner of the Timers tab
2. Fill in the timer details:
   - **Name**: Descriptive name for your timer (e.g., "Workout Timer")
   - **Duration**: Timer duration in seconds
   - **Category**: Category to group the timer (e.g., "Workout", "Study", "Break")
3. Tap "Save Timer"

### Managing Timers

- **Start/Pause**: Use individual timer controls to start or pause specific timers
- **Reset**: Reset any timer back to its original duration
- **Bulk Actions**: Use category-level controls to manage all timers in a category
- **Category Toggle**: Tap on category headers to expand/collapse timer groups

### Viewing History

- Switch to the "History" tab to view completed timers
- See completion timestamps and original durations
- Clear history using the "Clear" button

## Project Structure

```
app/
├── (tabs)/
│   ├── index.tsx          # Main timers screen
│   ├── history.tsx        # Timer history screen
│   └── _layout.tsx        # Tab navigation layout
├── modal.tsx              # Add timer modal
└── _layout.tsx            # Root layout

components/
├── Themed.tsx             # Themed components
└── ...

constants/
├── Colors.ts              # Color scheme definitions
└── ...
```

## Development Assumptions

1. **Timer Duration Input**: Users input duration in seconds for precise timing control
2. **Category Creation**: Categories are created automatically when users enter new category names
3. **Data Persistence**: All data is stored locally on the device using AsyncStorage
4. **Timer Accuracy**: Timers update every second using setInterval
5. **Completion Handling**: When timers complete, they're automatically moved to history and marked as completed
6. **Background Behavior**: Timers continue running when the app is in the foreground; background notifications would require additional setup

This project is developed as part of a coding assignment and is intended for evaluation purposes.
