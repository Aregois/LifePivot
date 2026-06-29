import * as Notifications from 'expo-notifications';

// Configure how notifications are displayed when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests notification permissions from the user.
 * Returns true if permissions are granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Schedules a daily repeating study reminder notification.
 * Overwrites any previously scheduled study reminders.
 */
export async function scheduleDailyStudyReminder(
  planTitle: string,
  dayNumber: number,
  taskCount: number,
  hour: number,
  minute: number
): Promise<string> {
  // Ensure permissions are granted before scheduling
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    throw new Error('Notification permissions not granted');
  }

  // Cancel any existing daily study reminders to prevent duplicates
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduledNotifications) {
    if (notification.content.data?.type === 'daily_study_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  // Configure body footprint exactly: "Day [X] of your [Plan Title] plan. [Y] tasks waiting."
  const body = `Day ${dayNumber} of your ${planTitle} plan. ${taskCount} tasks waiting.`;

  // Schedule repeating daily study reminder
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '📚 STUDY REMINDER',
      body,
      data: { type: 'daily_study_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });

  return identifier;
}
