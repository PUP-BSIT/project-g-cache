# POMODIFY USER GUIDE

**Welcome to Pomodify!** 🍅  
A smart Pomodoro productivity tracker that solves timer drift and motivation challenges. Features real-time session synchronization, 
intelligent activity categorization, streak-based tracking, and comprehensive reporting to help users build consistent focus habits and track meaningful progress.

---

## **TABLE OF CONTENTS**

1. [Getting Started](#getting-started)
2. [Account Management](#account-management)
3. [Activities & Categories](#activities--categories)
4. [Pomodoro Sessions](#pomodoro-sessions)
5. [AI Smart-Action System](#ai-smart-action-system)
6. [Session Notes & Todo Lists](#session-notes--todo-lists)
7. [Dashboard & Analytics](#dashboard--analytics)
8. [Settings & Preferences](#settings--preferences)
9. [Push Notifications](#push-notifications)
10. [Badges & Achievements](#badges--achievements)
11. [Tips & Best Practices](#tips--best-practices)
12. [Troubleshooting](#troubleshooting)

---

# **GETTING STARTED**

## **What is Pomodify?**

Pomodify is a smart modern productivity app that combines the proven Pomodoro Technique with AI-powered features to help you:
- Focus better with structured work sessions
- Track your productivity over time
- Get AI suggestions for optimal session planning
- Build consistent work habits
- Achieve your learning and work goals

## **Core Concepts**

### **🍅 Pomodoro Technique**
- **Focus Phase**: Work intensely for 25 minutes (customizable)
- **Break Phase**: Take a 5-minute break (customizable)
- **Cycles**: Repeat focus/break cycles (typically 4 cycles)
- **Long Break**: Take a longer break (15-30 minutes) after completing all cycles

### **📋 Activities**
- Represent your projects, subjects, or work areas
- Can be organized into categories
- Track progress across multiple sessions

### **⚡ Sessions**
- Individual Pomodoro or Freestyle work sessions
- Linked to specific activities
- Include notes and todo lists

---

# **ACCOUNT MANAGEMENT**

## **Creating Your Account**

### **Email Registration**
1. Visit the Pomodify app
2. Click "Sign Up"
3. Enter your first name, last name, email, and password
4. Check your email for verification link
5. Click the verification link to activate your account

### **Google Sign-In**
1. Click "Sign in with Google"
2. Choose your Google account
3. Grant necessary permissions
4. Your account is automatically created and verified

## **Account Security**

### **Password Management**
- **Change Password**: Go to Settings → Account → Change Password
- **Forgot Password**: Use "Forgot Password" on login page
- **Backup Email**: Set up a backup email for password recovery

### **Profile Management**
- **Update Profile**: Change your name in Settings → Profile
- **Profile Picture**: Upload a custom profile picture (max 5MB)
- **Delete Account**: Permanently delete your account and all data

## **Two-Factor Authentication**
- Email verification required for new accounts
- Backup email option for additional security
- Secure JWT token-based authentication

---

# **ACTIVITIES & CATEGORIES**

## **Creating Activities**

### **Manual Creation**
1. Go to Activities page
2. Click "Add Activity"
3. Enter activity title and description
4. Optionally assign to a category
5. Click "Create"

### **AI-Assisted Creation**
Use the Smart-Action Wizard to let AI create optimized activities for you (see AI section below).

## **Managing Categories**

### **Create Categories**
1. Go to Categories page
2. Click "Add Category"
3. Enter category name (e.g., "Work", "Study", "Personal")
4. Click "Create"

### **Organize Activities**
- Assign activities to categories for better organization
- Filter activities by category
- View activity counts per category

## **Activity Management**

### **Editing Activities**
- Click on any activity to edit title, description, or category
- Changes are saved automatically

### **Deleting Activities**
- Activities are soft-deleted (moved to trash)
- View deleted activities in the "Deleted" tab
- Permanently delete or restore from trash

### **Activity Statistics**
- View total sessions per activity
- Track focus hours per activity
- See completion rates and progress

---

# **POMODORO SESSIONS**

## **Session Types**

### **🍅 Pomodoro Sessions**
- Structured focus/break cycles
- Default: 25min focus, 5min break, 4 cycles
- Long breaks after completing all cycles
- Automatic phase transitions (optional)

### **🎯 Freestyle Sessions**
- Flexible timing without strict structure
- Customizable focus and break durations
- Skip phases as needed
- Perfect for creative work or studying

## **Creating Sessions**

### **Quick Session Creation**
1. Select an activity
2. Click "Start Session"
3. Choose session type (Pomodoro/Freestyle)
4. Customize timing if needed
5. Click "Create & Start"

### **Advanced Session Setup**
- **Focus Time**: 15-60 minutes
- **Break Time**: 5-15 minutes
- **Cycles**: 1-8 cycles
- **Long Breaks**: Enable/disable and customize timing
- **Auto-Start**: Automatically start breaks and next cycles

## **Session Controls**

### **During a Session**
- **⏸️ Pause**: Temporarily pause the timer
- **▶️ Resume**: Continue from where you paused
- **⏹️ Stop**: End current cycle (progress lost)
- **⏭️ Skip**: Move to next phase (Freestyle only)
- **🏁 Complete Early**: Finish session with current progress
- **🔄 Reset**: Start over from the beginning

### **Session States**
- **Not Started**: Session created but not begun
- **In Progress**: Currently running
- **Paused**: Temporarily stopped
- **Completed**: Successfully finished
- **Stopped**: Ended early without completion
- **Canceled**: Abandoned session

## **Real-Time Updates**

### **Live Session Monitoring**
- Real-time phase changes
- Automatic notifications
- Progress tracking
- Server-sent events for instant updates

---

# **AI SMART-ACTION SYSTEM**

## **Smart-Action Wizard**

The AI-powered Smart-Action system helps you create optimized activities and sessions based on your goals.

### **Getting AI Suggestions**
1. Click "Smart Action" on the dashboard
2. Describe your goal (e.g., "Learn React development")
3. Specify available time (e.g., 2 hours)
4. Choose experience level (Beginner/Intermediate/Advanced)
5. Let AI generate a customized plan

### **Blueprint Generation**

#### **Single Blueprint**
- AI creates one optimized activity and session plan
- Includes suggested focus times, breaks, and cycles
- Provides structured todo list
- Ready to start immediately

#### **Dual Blueprint**
- AI generates both Beginner and Intermediate plans
- Compare different approaches
- Choose the plan that fits your skill level
- Perfect for learning new skills

### **AI Features**

#### **Next Step Suggestions**
- Get AI recommendations for what to do next
- Based on your current progress and todos
- Contextual advice for your specific activity
- Helps maintain momentum and direction

#### **Quick Focus Sessions**
- Instant 25-minute focus session creation
- Perfect for urgent tasks or quick productivity boosts
- AI suggests optimal session structure
- One-click session start

## **Using AI Effectively**

### **Best Practices**
- Be specific about your goals
- Provide context about your experience level
- Review AI suggestions before confirming
- Adjust recommendations to fit your preferences

### **AI Learning**
- AI improves suggestions based on your usage patterns
- Completed sessions help refine future recommendations
- Feedback helps optimize session structures

---

# **SESSION NOTES & TODO LISTS**

## **Session Notes**

### **Adding Notes**
- Click the notes icon during or after a session
- Write detailed notes about your progress
- Notes are automatically saved
- Access notes from session history

## **Todo Lists**

### **Creating Todos**
1. Open session notes
2. Click "Add Todo"
3. Save todo item

### **Managing Todos**
- **✅ Check Off**: Mark items as completed
- **✏️ Edit**: Update task descriptions
- **🗑️ Delete**: Remove unnecessary items

### **Todo Features**
- Persistent across sessions
- Progress tracking
- Completion statistics
- Integration with AI suggestions

## **Productivity Tracking**

### **Session Insights**
- View notes and todos from past sessions
- Track completion rates
- Identify productive patterns
- Learn from successful sessions

---

# **DASHBOARD & ANALYTICS**

## **Focus Dashboard**

### **Key Metrics**
- **Current Streak**: Consecutive days with completed sessions
- **Best Streak**: Your longest streak achievement
- **Focus Hours Today**: Time spent in focus mode today
- **Focus Hours This Week**: Weekly focus time accumulation
- **Focus Hours All Time**: Total lifetime focus hours

### **Recent Activity**
- Latest completed sessions
- Recent achievements and badges
- Quick access to continue activities
- Progress toward current goals

## **Analytics & Reports**

### **Summary Reports**
- **Weekly Summary**: 7-day focus and break time breakdown
- **Monthly Summary**: 30-day productivity trends
- **Yearly Summary**: Annual progress and achievements
- **Custom Range**: Analyze any date range

### **Visual Analytics**
- **Focus Time Charts**: Daily/weekly/monthly trends
- **Activity Breakdown**: Time distribution across activities
- **Completion Rates**: Success rates for different session types
- **Productivity Patterns**: Best times of day for focus

### **Top Activities**
- Most productive activities
- Time invested per activity
- Session counts and averages
- Progress tracking over time

## **Progress Tracking**

### **Streak Management**
- Daily streak counters
- Streak recovery tips
- Motivation to maintain consistency
- Historical streak data

### **Goal Setting**
- Set daily/weekly focus time goals
- Track progress toward targets
- Celebrate milestone achievements
- Adjust goals based on performance

---

# **SETTINGS & PREFERENCES**

## **Session Settings**

### **Timer Preferences**
- **Default Focus Time**: 15-60 minutes (default: 25)
- **Default Break Time**: 5-15 minutes (default: 5)
- **Default Cycles**: 1-8 cycles (default: 4)
- **Long Break Duration**: 15-30 minutes (default: 15)
- **Long Break Interval**: After how many cycles (default: 4)

### **Automation Settings**
- **Auto-Start Breaks**: Automatically begin break timers
- **Auto-Start Pomodoros**: Automatically start next focus session
- **Auto-Complete**: Automatically mark phases as complete

## **Notification Settings**

### **Sound Preferences**
- **Sound Type**: Bell, Chime, Digital Beep, Soft Ding
- **Notification Sounds**: Enable/disable audio alerts
- **Volume Level**: 0-100% volume control
- **Custom Sounds**: Upload your own notification sounds

### **Push Notifications**
- **Enable Notifications**: Turn on/off push notifications
- **Phase Change Alerts**: Notify when switching focus/break
- **Session Completion**: Alert when sessions are completed
- **Streak Reminders**: Daily reminders to maintain streaks

## **Appearance Settings**

### **Theme Options**
- **Light Theme**: Clean, bright interface
- **Dark Theme**: Easy on the eyes for low-light environments

### **Display Preferences**
- **Time Format**: 12-hour or 24-hour display
- **Date Format**: Various international formats
- **Language**: Multiple language support
- **Timezone**: Automatic or manual timezone selection

## **Data Management**

### **Export Data**
- Export session history
- Download analytics reports
- Backup notes and todos
- Activity and category data

### **Clear Data**
- **Clear Session History**: Remove all past sessions
- **Clear Activity Data**: Delete activities and associated sessions
- **Delete Account**: Permanently remove all data

---

# **PUSH NOTIFICATIONS**

## **Setting Up Notifications**

### **Enable Push Notifications**
1. Go to Settings → Notifications
2. Click "Enable Push Notifications"
3. Allow browser/app permissions
4. Customize notification preferences

### **Notification Types**
- **Phase Changes**: Focus → Break transitions
- **Session Completion**: When sessions finish
- **Streak Reminders**: Daily motivation messages
- **Achievement Alerts**: New badges and milestones

## **Managing Notifications**

### **Customization Options**
- Choose which events trigger notifications
- Set quiet hours (no notifications during sleep)
- Customize notification sounds
- Adjust notification frequency

### **Troubleshooting Notifications**
- Check browser/device permissions
- Verify notification settings in app
- Test notifications with debug feature
- Re-register notification token if needed

---

# **BADGES & ACHIEVEMENTS**

## **Achievement System**

### **Badge Categories**
- **🏆 Milestones**: First session, 10 sessions, 100 sessions
- **🔥 Streaks**: 3-day, 7-day, 30-day, 100-day streaks
- **⏰ Focus Time**: 10 hours, 50 hours, 100 hours total
- **📚 Learning**: Complete activities in different categories
- **🎯 Consistency**: Regular daily usage patterns

### **Earning Badges**
- Badges are automatically awarded
- Real-time notifications when earned
- Progress tracking toward next badges
- Retroactive badge awards for past achievements

## **Badge Benefits**

### **Motivation & Gamification**
- Visual progress indicators
- Social sharing capabilities
- Personal achievement history
- Friendly competition features

### **Unlocking Features**
- Some advanced features unlock with badges
- Premium themes and customizations
- Special session types and modes
- Enhanced analytics and reports

---

# **TROUBLESHOOTING**

## **Common Issues**

### **Login Problems**
- **Forgot Password**: Use password reset feature
- **Email Not Verified**: Check spam folder for verification email
- **Google Sign-in Issues**: Clear browser cache and try again
- **Account Locked**: Contact support if multiple login failures

### **Session Issues**
- **Timer Not Starting**: Check browser permissions and refresh page
- **Notifications Not Working**: Verify notification settings and permissions
- **Data Not Syncing**: Check internet connection and try refreshing
- **Session Lost**: Use session recovery feature if available

### **Performance Issues**
- **App Running Slowly**: Clear browser cache and cookies
- **High Battery Usage**: Adjust notification frequency
- **Sync Problems**: Log out and log back in
- **Missing Data**: Check if you're logged into the correct account

## **Getting Help**

### **Self-Help Resources**
- Check this user guide for detailed instructions
- Review FAQ section for common questions
- Watch tutorial videos for visual guidance
- Browse community forums for user tips

### **Contact Support**
- **In-App Support**: Use the contact form in Settings
- **Email Support**: Send detailed bug reports
- **Feature Requests**: Suggest improvements through feedback form
- **Community**: Join user groups for peer support

### **Reporting Bugs**
When reporting issues, include:
- Device/browser information
- Steps to reproduce the problem
- Screenshots if applicable
- Error messages (if any)
- Your account email (for investigation)

---
