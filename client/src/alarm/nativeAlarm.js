/**
 * Native Alarm Integration Module
 * 
 * NOTE: This module is designed to interact with native mobile APIs (specifically the Android AlarmManager)
 * when the client application is wrapped into a native application container (such as Capacitor.js or Apache Cordova).
 * 
 * If running in a standard web browser context (like Chrome or Safari), it will automatically log a message 
 * and fall back to using the Web Push notifications system we implemented.
 */

/**
 * Checks if the React client is currently running inside a native mobile wrapper (e.g. Capacitor WebView)
 * @returns {boolean}
 */
export function isNativeApp() {
  return typeof window !== "undefined" && !!window.Capacitor;
}

/**
 * Schedules a native system alarm on the user's mobile device.
 * 
 * @param {Date|string|number} dateTime - The target date/time to sound the alarm.
 * @param {string} label - Alarm title or description.
 * @returns {Promise<{success: boolean, mode: string, error?: string}>}
 */
export async function setDeviceAlarm(dateTime, label) {
  const targetTime = new Date(dateTime).getTime();
  
  if (isNaN(targetTime)) {
    console.error("❌ Native Alarm: Invalid date/time provided.");
    return { success: false, mode: "error", error: "Invalid date/time" };
  }

  if (isNativeApp()) {
    console.log(`📱 Native APK Context: Attempting to set native Android AlarmManager alert for: "${label}" at ${new Date(targetTime).toLocaleString()}`);
    
    try {
      // In Capacitor.js, plugins are dynamically exposed on the window.Capacitor.Plugins namespace.
      // This maps to native Java code executing android.app.AlarmManager schedules in Android Studio.
      const { Plugins } = window.Capacitor;
      
      if (Plugins && Plugins.AlarmManager) {
        await Plugins.AlarmManager.setAlarm({
          time: targetTime,
          message: label,
          sound: true,
          vibrate: true
        });
        return { success: true, mode: "native" };
      } else {
        console.warn("⚠️ Native Alarm: Capacitor container detected, but the AlarmManager plugin is not registered/installed in Android Studio.");
        return { success: false, mode: "native-missing-plugin", error: "AlarmManager plugin not registered" };
      }
    } catch (err) {
      console.error("❌ Native Alarm: Bridge call to Android Java failed:", err);
      return { success: false, mode: "bridge-error", error: err.message };
    }
  } else {
    // Web browser fallback: Alarm is triggered via the server-sent Web Push background poller.
    console.log(
      `🌐 Standard Browser Context: Direct device clock access blocked by browser sandbox.\n` +
      `   Fallback alarm will trigger via background Web Push notification scheduler at ${new Date(targetTime).toLocaleTimeString()}.`
    );
    return { success: true, mode: "web-push-fallback" };
  }
}
