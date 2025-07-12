# Timer App

A React Native timer application built with Expo that allows users to create, manage, and track multiple customizable timers with category-based organization.

[⬇️ Download APK](https://expo.dev/accounts/kapil619/projects/TimerApp/builds/e111ee1a-b2eb-4015-abac-40ce46199edb)


## Images
<div align="center" >
  <p float="left">
    <img src="https://github.com/user-attachments/assets/f35b472f-3f1f-419f-805d-10d8221ff824" width="180" alt="Home Screen"/>&nbsp;&nbsp;
    <img src="https://github.com/user-attachments/assets/b4b58c83-28f4-4976-bd42-1ff6dc3c14d4" width="180" alt="Device Control Screen"/>
    <img src="https://github.com/user-attachments/assets/2973966b-2fa5-4c96-9031-bd5dad0ff340" width="180" alt="Device Control Screen"/>
     </p>
     <p float="left">
    <img src="https://github.com/user-attachments/assets/c3440fbe-0195-42f7-b173-67fad2aacdde" width="180" alt="Dashboard Screen"/>
    <img src="https://github.com/user-attachments/assets/57e71844-2e51-41a7-8202-114b1404af60" width="180" alt="Analytics Screen"/>
    <img src="https://github.com/user-attachments/assets/3cea6401-5037-4ff5-968b-14b8824ff0e5" width="180" alt="Analytics Screen"/>
  </p>
</div>


## Development Assumptions
- ✅ Timer Duration Input  
- ✅ Category Creation  
- ✅ Data Persistence  
- ✅ Timer Accuracy  
- ✅ Completion Handling  
- ✅ Background Behavior  


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

## Installation & Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/Kapil619/TimerApp.git
   cd TimerApp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
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


This project is developed as part of a coding assignment and is intended for evaluation purposes.
