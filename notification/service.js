import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import webpush from "web-push";
import { Subscription } from "./model.js";
import { Task } from "../task/model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VAPID_KEY_PATH = path.join(__dirname, "vapid.json");

let vapidKeys = null;

// Initialize VAPID Keys (generate them if not present)
export function initVapidKeys() {
  if (vapidKeys) return vapidKeys;

  // 1. Check environment variables first (perfect for Vercel/ephemeral container deploys)
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    console.log("🔑 VAPID Keys: Found keys in environment variables.");
    vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };
  } else {
    // 2. Fall back to local file or dynamic generation
    try {
      if (fs.existsSync(VAPID_KEY_PATH)) {
        console.log("🔑 VAPID Keys: Found existing keys file.");
        const content = fs.readFileSync(VAPID_KEY_PATH, "utf-8");
        vapidKeys = JSON.parse(content);
      } else {
        console.log("🔑 VAPID Keys: Generating new public/private keys...");
        vapidKeys = webpush.generateVAPIDKeys();
        fs.writeFileSync(VAPID_KEY_PATH, JSON.stringify(vapidKeys, null, 2), "utf-8");
        console.log("🔑 VAPID Keys: Keys successfully saved to notification/vapid.json.");
      }
    } catch (err) {
      console.error("❌ Failed to initialize VAPID keys file fallback:", err);
      throw err;
    }
  }

  try {
    // Configure web-push details
    webpush.setVapidDetails(
      "mailto:ashi778@gmail.com",
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );

    return vapidKeys;
  } catch (err) {
    console.error("❌ Failed to initialize VAPID keys:", err);
    throw err;
  }
}

/**
 * Send a push notification to a browser subscription.
 * Clean up the database record if the subscription has expired or is invalid (410 Gone / 404).
 */
export async function sendPushNotification(subscription, payload) {
  initVapidKeys(); // Ensure initialized

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth
    }
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    console.log(`🔔 Notification sent successfully to: ${subscription.endpoint.slice(0, 40)}...`);
    return true;
  } catch (err) {
    // 410 (Gone) or 404 (Not Found) means subscription has expired or unsubscribed
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`🗑 Removing expired/inactive push subscription: ${subscription.endpoint.slice(0, 40)}...`);
      await Subscription.deleteOne({ _id: subscription._id });
    } else {
      console.error(`❌ Push notification failed for ${subscription.endpoint.slice(0, 40)}...:`, err.message);
    }
    return false;
  }
}

/**
 * Poll database for tasks starting soon that haven't been alerted.
 */
async function pollAndTriggerAlerts() {
  try {
    const now = new Date();

    // Query incomplete tasks that haven't been alerted yet
    const pendingTasks = await Task.find({
      completed: false,
      alertSent: { $ne: true }
    });

    if (pendingTasks.length === 0) return;

    for (const task of pendingTasks) {
      // Safely parse task date and start time (e.g. date: "2026-06-24", start: "11:00")
      const combinedDateTimeStr = `${task.date}T${task.start}:00`;
      const taskStartTime = new Date(combinedDateTimeStr);

      if (isNaN(taskStartTime.getTime())) {
        console.error(`⚠️ Task ${task._id} has invalid start date/time format: "${combinedDateTimeStr}"`);
        continue;
      }

      // Check if scheduled time has arrived or passed
      if (taskStartTime <= now) {
        console.log(`⏰ Triggering alert for task: "${task.label}" (Scheduled: ${combinedDateTimeStr})`);

        // Find subscriptions for the task's user
        const subscriptions = await Subscription.find({ userId: task.userId });

        if (subscriptions.length > 0) {
          const payload = {
            title: task.label,
            body: `${task.sub} (${task.start} - ${task.end})`,
            icon: "/favicon.svg",
            data: {
              taskId: task._id,
              url: `/task-chat/${task._id}`
            }
          };

          // Send push notifications in parallel
          await Promise.all(
            subscriptions.map(sub => sendPushNotification(sub, payload))
          );
        } else {
          console.log(`⚠️ No active browser subscriptions found for user: ${task.userId}`);
        }

        // Mark the task's alert as sent to prevent multiple alerts
        task.alertSent = true;
        await task.save();
      }
    }
  } catch (error) {
    console.error("❌ Error in notifications scheduler:", error);
  }
}

/**
 * Start the background scheduler interval loop (polls every 30 seconds).
 */
export function startNotificationScheduler() {
  initVapidKeys(); // Bootstrap VAPID keys on startup
  console.log("⏰ Task Notification Scheduler started.");
  
  // Run polling immediately, then every 30 seconds
  pollAndTriggerAlerts();
  setInterval(pollAndTriggerAlerts, 30000);
}
