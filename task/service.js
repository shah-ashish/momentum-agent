import { Task } from "./model.js";

/**
 * Creates tasks for a specific user and date.
 * @param {string|ObjectId} userId - ID of the user.
 * @param {Array<Object>} tasksArray - List of task objects from the planner.
 * @param {string} dateString - The target date in YYYY-MM-DD format.
 */
export async function createTasks(userId, tasksArray, dateString) {
  if (!Array.isArray(tasksArray)) {
    throw new Error("tasksArray must be an array");
  }

  // Get existing tasks for that user and date to check conflicts
  const existingTasks = await Task.find({ userId, date: dateString });

  for (const newTask of tasksArray) {
    const newStart = newTask.start;
    const newEnd = newTask.end;

    if (newStart >= newEnd) {
      throw new Error(`Invalid time interval: Start time "${newStart}" must be earlier than end time "${newEnd}".`);
    }

    // 1. Check conflict with existing database tasks
    for (const extTask of existingTasks) {
      if (newStart < extTask.end && extTask.start < newEnd) {
        throw new Error(`Scheduling conflict: Task "${newTask.label}" (${newStart} - ${newEnd}) overlaps with existing task "${extTask.label}" (${extTask.start} - ${extTask.end}).`);
      }
    }

    // 2. Check conflict with other tasks within the creation array itself
    for (const otherTask of tasksArray) {
      if (newTask !== otherTask) {
        if (newStart < otherTask.end && otherTask.start < newEnd) {
          throw new Error(`Scheduling conflict: Task "${newTask.label}" (${newStart} - ${newEnd}) overlaps with another scheduled task "${otherTask.label}" (${otherTask.start} - ${otherTask.end}).`);
        }
      }
    }
  }

  const tasksToSave = tasksArray.map(task => {
    const payload = {
      userId,
      taskId: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: task.type,
      icon: task.icon,
      label: task.label,
      sub: task.sub,
      start: task.start,
      end: task.end,
      date: dateString,
      completed: false
    };

    if (task.type === "interview") {
      payload.topics = Array.isArray(task.topics) ? task.topics : [];
    } else if (task.type === "jobsearch") {
      payload.criteria = task.criteria || "";
    } else if (task.type === "reminder") {
      payload.note = task.note || "";
    }

    return payload;
  });

  return await Task.insertMany(tasksToSave);
}

/**
 * Retrieves tasks for a specific user and date string (YYYY-MM-DD).
 */
export async function getTasksByDate(userId, dateString) {
  return await Task.find({ userId, date: dateString }).sort({ start: 1 });
}

/**
 * Retrieves today's tasks for a specific user (in UTC or server local date).
 */
export async function getTodayTasks(userId) {
  // Use YYYY-MM-DD format based on server time
  const todayStr = new Date().toISOString().split("T")[0];
  return await getTasksByDate(userId, todayStr);
}

/**
 * Updates a specific task's fields for a given user.
 */
export async function updateTask(userId, mongoId, updateData) {
  // Check if scheduling times are updated
  if (updateData.start !== undefined || updateData.end !== undefined) {
    const currentTask = await Task.findOne({ _id: mongoId, userId });
    if (currentTask) {
      const updatedStart = updateData.start !== undefined ? String(updateData.start) : currentTask.start;
      const updatedEnd = updateData.end !== undefined ? String(updateData.end) : currentTask.end;

      if (updatedStart >= updatedEnd) {
        throw new Error(`Invalid time interval: Start time "${updatedStart}" must be earlier than end time "${updatedEnd}".`);
      }

      // Check conflict with other tasks on the same date
      const otherTasks = await Task.find({
        userId,
        date: currentTask.date,
        _id: { $ne: mongoId }
      });

      for (const extTask of otherTasks) {
        if (updatedStart < extTask.end && extTask.start < updatedEnd) {
          throw new Error(`Scheduling conflict: Updated time (${updatedStart} - ${updatedEnd}) overlaps with existing task "${extTask.label}" (${extTask.start} - ${extTask.end}).`);
        }
      }
    }
  }

  // Only allow updating non-identifying attributes to prevent security bypass
  const allowedUpdates = {};
  if (updateData.completed !== undefined) allowedUpdates.completed = !!updateData.completed;
  if (updateData.label !== undefined) allowedUpdates.label = String(updateData.label).trim();
  if (updateData.sub !== undefined) allowedUpdates.sub = String(updateData.sub).trim();
  if (updateData.start !== undefined) allowedUpdates.start = String(updateData.start);
  if (updateData.end !== undefined) allowedUpdates.end = String(updateData.end);
  if (updateData.topics !== undefined) allowedUpdates.topics = Array.isArray(updateData.topics) ? updateData.topics : [];
  if (updateData.criteria !== undefined) allowedUpdates.criteria = String(updateData.criteria);
  if (updateData.note !== undefined) allowedUpdates.note = String(updateData.note);

  return await Task.findOneAndUpdate(
    { _id: mongoId, userId },
    { $set: allowedUpdates },
    { returnDocument: 'after' }
  );
}

/**
 * Deletes a specific task for a user.
 */
export async function deleteTask(userId, mongoId) {
  return await Task.findOneAndDelete({ _id: mongoId, userId });
}
