import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Automatically schedules native system alarms (local notifications) for upcoming tasks
 * when running inside the Capacitor Android/iOS app.
 */
export async function scheduleMobileNotifications(tasks) {
  if (!Capacitor.isNativePlatform()) {
    // Fall back to web-based notification behavior if running in browser
    return;
  }

  try {
    // 1. Request display notification permissions if not granted
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      const request = await LocalNotifications.requestPermissions();
      if (request.display !== 'granted') {
        console.warn('⚠️ Native notifications permission was denied.');
        return;
      }
    }

    // 2. Clear all previously scheduled notifications to avoid duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications && pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }

    // 3. Schedule a native notification for each task starting in the future
    const notificationsToSchedule = [];
    const now = new Date();

    tasks.forEach((task, index) => {
      // Format example: date: "2026-06-24", start: "17:30"
      const combinedDateTimeStr = `${task.date}T${task.start}:00`;
      const startTime = new Date(combinedDateTimeStr);

      // Schedule only if the start time is in the future
      if (!isNaN(startTime.getTime()) && startTime > now) {
        // Generate a unique 32-bit integer ID from the MongoDB ObjectId
        const numericId = parseInt(task._id?.substring(0, 8), 16) || (index + 100);

        notificationsToSchedule.push({
          id: numericId,
          title: `⏰ Task Alert: ${task.label}`,
          body: `${task.sub || ""} (${task.start} - ${task.end})`,
          schedule: { at: startTime },
          sound: null, // Uses default system notification sound
          extra: { taskId: task._id }
        });
      }
    });

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
      console.log(`✅ Scheduled ${notificationsToSchedule.length} native alarms/reminders.`);
    }
  } catch (err) {
    console.error('❌ Failed to schedule native local notifications:', err);
  }
}
