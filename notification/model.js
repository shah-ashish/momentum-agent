import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  endpoint: {
    type: String,
    required: true,
    unique: true
  },
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  }
}, {
  timestamps: true
});

// Index by userId for fast retrieval when notifying a specific user
subscriptionSchema.index({ userId: 1 });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
