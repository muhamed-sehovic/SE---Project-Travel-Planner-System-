

const db = require("../config/database");
const { asyncHandler } = require("../middleware/errorHandler");


const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await db.findAll("notifications", { user_id: req.user.id });

  notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const unread_count = notifications.filter((n) => !n.is_read).length;

  res.json({ notifications, unread_count });
});


const markRead = asyncHandler(async (req, res) => {
  const notifId      = parseInt(req.params.id, 10);
  const notification = await db.findById("notifications", notifId);

  if (!notification) return res.status(404).json({ message: "Notification not found." });
  if (notification.user_id !== req.user.id) return res.status(403).json({ message: "Access denied." });

  const updated = await db.update("notifications", notifId, { is_read: 1 });
  res.json({ message: "Marked as read.", notification: updated });
});


const markAllRead = asyncHandler(async (req, res) => {
  await db.pool.query(
    "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
    [req.user.id]
  );
  res.json({ message: "All notifications marked as read." });
});


const deleteNotification = asyncHandler(async (req, res) => {
  const notifId      = parseInt(req.params.id, 10);
  const notification = await db.findById("notifications", notifId);

  if (!notification) return res.status(404).json({ message: "Notification not found." });
  if (notification.user_id !== req.user.id) return res.status(403).json({ message: "Access denied." });

  await db.delete("notifications", notifId);
  res.json({ message: "Notification deleted." });
});


const updateNotificationSettings = asyncHandler(async (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "'enabled' must be a boolean." });
  }

  await db.update("users", req.user.id, { notifications_enabled: enabled ? 1 : 0 });
  res.json({ message: `Notifications ${enabled ? "enabled" : "disabled"}.`, enabled });
});

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  updateNotificationSettings,
};
