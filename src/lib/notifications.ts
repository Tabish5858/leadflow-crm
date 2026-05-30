/**
 * Notification helper — creates notifications for key events.
 * Import and call these from anywhere in the app.
 */
import type { Notification } from "@/types";

type NotificationType = Notification["type"];

interface NotifyOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  leadId?: string;
  taskId?: string;
}

/**
 * Create a notification (fire-and-forget).
 * Failures are silently swallowed — notifications are best-effort.
 */
export async function notify(options: NotifyOptions): Promise<void> {
  try {
    const { createNotification } = await import("@/lib/firebase/notifications");
    await createNotification({
      userId: options.userId,
      type: options.type,
      title: options.title,
      message: options.message,
      leadId: options.leadId || null,
      taskId: options.taskId || null,
      read: false,
    });
  } catch {
    // Non-critical
  }
}

/**
 * Notify when a lead is assigned to someone.
 */
export async function notifyLeadAssigned(
  assignedUserId: string,
  leadName: string,
  assignedByName: string,
  leadId: string
): Promise<void> {
  await notify({
    userId: assignedUserId,
    type: "lead_assigned",
    title: "Lead Assigned",
    message: `${assignedByName} assigned you the lead "${leadName}"`,
    leadId,
  });
}

/**
 * Notify when a meeting is scheduled.
 */
export async function notifyMeetingScheduled(
  attendeeUserId: string,
  meetingTitle: string,
  scheduledByName: string,
  startTime: Date
): Promise<void> {
  const timeStr = startTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  await notify({
    userId: attendeeUserId,
    type: "system",
    title: "Meeting Scheduled",
    message: `${scheduledByName} scheduled "${meetingTitle}" for ${timeStr}`,
  });
}

/**
 * Notify when a follow-up is due.
 */
export async function notifyFollowUpDue(
  userId: string,
  leadName: string,
  leadId: string
): Promise<void> {
  await notify({
    userId,
    type: "follow_up_due",
    title: "Follow-up Due",
    message: `Time to follow up with "${leadName}"`,
    leadId,
  });
}

/**
 * Notify when a task is due.
 */
export async function notifyTaskDue(
  userId: string,
  taskTitle: string,
  taskId: string
): Promise<void> {
  await notify({
    userId,
    type: "task_due",
    title: "Task Due",
    message: `Task "${taskTitle}" is due now`,
    taskId,
  });
}

/**
 * Notify when someone sends you a message.
 */
export async function notifyNewMessage(
  recipientUserId: string,
  senderName: string,
  conversationId: string
): Promise<void> {
  await notify({
    userId: recipientUserId,
    type: "mention",
    title: "New Message",
    message: `${senderName} sent you a message`,
  });
}
