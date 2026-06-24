import { Router } from "express";
import { authenticateToken } from "../user/middleware.js";
import { Subscription } from "./model.js";
import { User } from "../user/model.js";
import { initVapidKeys, sendPushNotification } from "./service.js";

const router = Router();

/**
 * GET /service/notifications/vapid-public-key
 * Returns the VAPID public key to browser client for push subscription setup.
 */
router.get("/vapid-public-key", (req, res) => {
  try {
    const keys = initVapidKeys();
    return res.status(200).json({ publicKey: keys.publicKey });
  } catch (err) {
    console.error("Failed to retrieve VAPID public key:", err);
    return res.status(500).json({ error: "Failed to initialize notification keys." });
  }
});

/**
 * POST /service/notifications/subscribe
 * Registers or updates a browser push subscription for the logged-in user.
 */
router.post("/subscribe", authenticateToken, async (req, res) => {
  const { subscription } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
    return res.status(400).json({ error: "Invalid subscription payload." });
  }

  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Upsert subscription (update existing if endpoint matches)
    const savedSub = await Subscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId: user._id,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log(`🔌 Registered push subscription for: ${user.email} (Endpoint: ${subscription.endpoint.slice(0, 40)}...)`);

    return res.status(200).json({
      success: true,
      message: "Push subscription successfully registered."
    });
  } catch (err) {
    console.error("Failed to register subscription:", err);
    return res.status(500).json({ error: "Internal server error registering push subscription." });
  }
});

/**
 * POST /service/notifications/test-alert
 * Trigger an immediate test alarm to all active browser sessions of the authenticated user.
 */
router.post("/test-alert", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Retrieve active subscriptions for the user
    const subscriptions = await Subscription.find({ userId: user._id });

    if (subscriptions.length === 0) {
      return res.status(404).json({
        error: "No active push notifications subscription found for this browser. Please enable permissions and try again."
      });
    }

    const payload = {
      title: "Test Alarm Triggered! 🚀",
      body: `This is a native test Web Push notification. Date: ${new Date().toLocaleDateString()} Time: ${new Date().toLocaleTimeString()}`,
      icon: "/favicon.svg",
      data: {
        url: "/"
      }
    };

    // Send push notifications in parallel
    const sendResults = await Promise.all(
      subscriptions.map(sub => sendPushNotification(sub, payload))
    );

    const successCount = sendResults.filter(Boolean).length;

    return res.status(200).json({
      success: true,
      message: `Test notifications triggered. Sent: ${successCount}/${subscriptions.length} successfully.`
    });
  } catch (err) {
    console.error("Failed to trigger test notification:", err);
    return res.status(500).json({ error: "Internal server error triggering test notification." });
  }
});

export default router;
