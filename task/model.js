import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  taskId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ["interview", "jobsearch", "reminder"],
    required: true
  },
  icon: {
    type: String,
    enum: ["book", "briefcase", "sunrise", "target"],
    required: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  sub: {
    type: String,
    required: true,
    trim: true
  },
  start: {
    type: String,
    required: true
  },
  end: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  date: {
    type: String, // format: "YYYY-MM-DD"
    required: true
  },
  // Conditional fields based on type
  topics: {
    type: [String],
    default: undefined
  },
  criteria: {
    type: String,
    trim: true
  },
  note: {
    type: String,
    trim: true
  },
  alertSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index on userId and date for highly efficient querying
taskSchema.index({ userId: 1, date: 1 });

export const Task = mongoose.model("Task", taskSchema);
