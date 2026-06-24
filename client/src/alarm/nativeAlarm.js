/**
 * Native Alarm — uses the custom AlarmManagerPlugin (Java)
 * which calls Android's ACTION_SET_ALARM → appears in phone Clock app
 */

export function isNativeApp() {
  return typeof window !== "undefined" && !!window.Capacitor;
}

function getPlugin() {
  if (!isNativeApp()) return null;
  return window.Capacitor?.Plugins?.AlarmManager || null;
}

/**
 * Set a daily alarm visible in the phone Clock app
 * @param {number} hour - 0–23
 * @param {number} minute - 0–59
 * @param {string} message - alarm label
 */
export async function setDeviceAlarm(hour, minute, message, vibrate = true) {
  const plugin = getPlugin();

  if (!plugin) {
    console.log(`[Browser] Would set alarm at ${hour}:${String(minute).padStart(2,'0')} — "${message}"`);
    return { success: true, mode: "browser-noop" };
  }

  try {
    const result = await plugin.setAlarm({ hour, minute, message, vibrate });
    console.log(`✅ Alarm set in Clock app: ${hour}:${String(minute).padStart(2,'0')} — "${message}"`);
    return { success: true, mode: "native", ...result };
  } catch (err) {
    console.error("❌ Alarm failed:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Dismiss an alarm by hour + minute
 */
export async function dismissDeviceAlarm(hour, minute) {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.dismissAlarm({ hour, minute });
  } catch (e) {
    console.error("Dismiss failed:", e);
  }
}
