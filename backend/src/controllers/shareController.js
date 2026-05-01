

const crypto = require("crypto");
const db     = require("../config/database");
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


const generateShareLink = asyncHandler(async (req, res) => {
  const tripId = parseInt(req.params.tripId, 10);
  const trip   = await ownTrip(tripId, req.user.id, res);
  if (!trip) return;

  await db.deleteWhere("shared_trips", { trip_id: tripId });

  const token      = crypto.randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  await db.insert("shared_trips", { trip_id: tripId, share_token: token, expires_at });

  const shareUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/share/${token}`;

  res.status(201).json({
    message:   "Share link generated.",
    share_url: shareUrl,
    token,
    expires_at,
  });
});

const revokeShareLink = asyncHandler(async (req, res) => {
  const tripId = parseInt(req.params.tripId, 10);
  const trip   = await ownTrip(tripId, req.user.id, res);
  if (!trip) return;

  await db.deleteWhere("shared_trips", { trip_id: tripId });

  res.json({ message: "Share link revoked." });
});

const viewSharedTrip = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const shareRecord = await db.findOne("shared_trips", { share_token: token });

  if (!shareRecord) {
    return res.status(403).json({ message: "Share link is invalid or has expired." });
  }

  if (new Date(shareRecord.expires_at) < new Date()) {
    return res.status(403).json({ message: "Share link has expired." });
  }

  const trip = await db.findById("trips", shareRecord.trip_id);
  if (!trip) {
    return res.status(404).json({ message: "Trip not found." });
  }

  const tripDests  = await db.findAll("trip_destinations", { trip_id: trip.id });
  const destinations = (
    await Promise.all(tripDests.map((td) => db.findById("destinations", td.destination_id)))
  ).filter(Boolean);

  const itinerary = (await db.findAll("itinerary", { trip_id: trip.id })).sort(
    (a, b) =>
      new Date(`${a.activity_date}T${a.activity_time || "00:00"}`) -
      new Date(`${b.activity_date}T${b.activity_time || "00:00"}`)
  );

  res.json({
    trip: {
      id:           trip.id,
      name:         trip.name,
      start_date:   trip.start_date,
      end_date:     trip.end_date,
      destinations,
      itinerary,
    },
    expires_at: shareRecord.expires_at,
  });
});

module.exports = { generateShareLink, revokeShareLink, viewSharedTrip };
