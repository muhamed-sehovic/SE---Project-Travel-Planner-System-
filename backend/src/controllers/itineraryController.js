

const db = require("../config/database");
const { asyncHandler } = require("../middleware/errorHandler");

const ownTrip = async (tripId, userId, res) => {
  const trip = await db.findById("trips", tripId);
  if (!trip) {
    res.status(404).json({ message: "Trip not found." });
    return null;
  }
  if (trip.user_id !== userId) {
    res.status(403).json({ message: "Access denied." });
    return null;
  }
  return trip;
};

const ownActivity = async (activityId, tripId, res) => {
  const activity = await db.findById("itinerary", activityId);
  if (!activity) {
    res.status(404).json({ message: "Activity not found." });
    return null;
  }
  if (activity.trip_id !== tripId) {
    res.status(403).json({ message: "Activity does not belong to this trip." });
    return null;
  }
  return activity;
};

const sortActivities = (activities) =>
  [...activities].sort(
    (a, b) =>
      new Date(`${a.activity_date}T${a.activity_time || "00:00"}`) -
      new Date(`${b.activity_date}T${b.activity_time || "00:00"}`)
  );

const getItinerary = asyncHandler(async (req, res) => {
  const tripId = parseInt(req.params.tripId, 10);
  const trip = await ownTrip(tripId, req.user.id, res);
  if (!trip) return;

  const activities = await db.findAll("itinerary", { trip_id: tripId });
  res.json({ itinerary: sortActivities(activities) });
});

const createActivity = asyncHandler(async (req, res) => {
  const tripId = parseInt(req.params.tripId, 10);
  const trip = await ownTrip(tripId, req.user.id, res);
  if (!trip) return;

  const { title, activity_date, activity_time, description } = req.body;

  const actDate   = new Date(activity_date);
  const tripStart = new Date(trip.start_date);
  const tripEnd   = new Date(trip.end_date);

  if (actDate < tripStart || actDate > tripEnd) {
    return res.status(400).json({
      message: `Activity date must be between trip start (${trip.start_date}) and end (${trip.end_date}).`,
    });
  }

  const activity = await db.insert("itinerary", {
    trip_id: tripId,
    title,
    activity_date,
    activity_time: activity_time || null,
    description:   description   || null,
  });

  scheduleActivityNotifications(activity, req.user.id, trip).catch(console.error);

  res.status(201).json({ message: "Activity created.", activity });
});

const updateActivity = asyncHandler(async (req, res) => {
  const tripId     = parseInt(req.params.tripId, 10);
  const activityId = parseInt(req.params.id, 10);

  const trip = await ownTrip(tripId, req.user.id, res);
  if (!trip) return;

  const activity = await ownActivity(activityId, tripId, res);
  if (!activity) return;

  const { title, activity_date, activity_time, description } = req.body;

  const newDate = activity_date || activity.activity_date;
  const actDate   = new Date(newDate);
  const tripStart = new Date(trip.start_date);
  const tripEnd   = new Date(trip.end_date);

  if (actDate < tripStart || actDate > tripEnd) {
    return res.status(400).json({
      message: `Activity date must be between trip start (${trip.start_date}) and end (${trip.end_date}).`,
    });
  }

  const updated = await db.update("itinerary", activityId, {
    title:          title          || activity.title,
    activity_date:  newDate,
    activity_time:  activity_time  !== undefined ? activity_time  : activity.activity_time,
    description:    description    !== undefined ? description    : activity.description,
  });

  res.json({ message: "Activity updated.", activity: updated });
});

const deleteActivity = asyncHandler(async (req, res) => {
  const tripId     = parseInt(req.params.tripId, 10);
  const activityId = parseInt(req.params.id, 10);

  const trip = await ownTrip(tripId, req.user.id, res);
  if (!trip) return;

  const activity = await ownActivity(activityId, tripId, res);
  if (!activity) return;

  await db.deleteWhere("notifications", { itinerary_id: activityId });
  await db.delete("itinerary", activityId);

  res.json({ message: "Activity deleted." });
});


const scheduleActivityNotifications = async (activity, userId, trip) => {
  const user = await db.findById("users", userId);
  if (!user || !user.notifications_enabled) return;

  const actDatetime = new Date(`${activity.activity_date}T${activity.activity_time || "09:00"}:00`);
  const offsets = [
    { minutes: 24 * 60, label: "24 hours" },
    { minutes:      60, label:  "1 hour"  },
  ];

  for (const { minutes, label } of offsets) {
    const triggerAt = new Date(actDatetime.getTime() - minutes * 60 * 1000);
    if (triggerAt > new Date()) {
      await db.insert("notifications", {
        user_id:      userId,
        trip_id:      trip.id,
        itinerary_id: activity.id,
        message:      `Reminder: "${activity.title}" in ${label} — ${trip.name}`,
        is_read:      0,
      });
    }
  }
};

module.exports = { getItinerary, createActivity, updateActivity, deleteActivity };
