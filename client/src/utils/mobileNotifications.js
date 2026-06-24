import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { setDeviceAlarm } from '../alarm/nativeAlarm.js';

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

    // 2. Create a high-importance channel (essential for Android 8.0+ to make sound/pop-up)
    const channelId = 'task-alarms';
    await LocalNotifications.createChannel({
      id: channelId,
      name: 'Task Alarms & Reminders',
      description: 'High-priority alarms and reminders for scheduled tasks',
      importance: 5, // Max importance (makes sound and displays heads-up/banners)
      visibility: 1, // Show on lock screen
      sound: null, // Use default system ringtone/alarm sound
      vibration: true
    });

    // 3. Clear all previously scheduled notifications to avoid duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications && pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }

    // 4. Schedule a native notification for each task starting in the future
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

        // A: Schedule local notification (heads-up popup alert)
        notificationsToSchedule.push({
          id: numericId,
          title: `🚨 Alarm: ${task.label}`,
          body: `${task.sub || ""} (Scheduled: ${task.start} - ${task.end})`,
          channelId: channelId, // Link to high importance channel
          schedule: { 
            at: startTime,
            allowWhileIdle: true // Delivery precisely at the scheduled time even when phone is in doze/power-saving mode
          },
          extra: { taskId: task._id }
        });

        // B: Set a native Clock app alarm using our custom Java plugin!
        const [hourStr, minuteStr] = task.start.split(":");
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        if (!isNaN(hour) && !isNaN(minute)) {
          setDeviceAlarm(hour, minute, task.label);
        }
      }
    });

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
      console.log(`✅ Scheduled ${notificationsToSchedule.length} native exact alarms.`);
    }
  } catch (err) {
    console.error('❌ Failed to schedule native local notifications:', err);
  }
}
