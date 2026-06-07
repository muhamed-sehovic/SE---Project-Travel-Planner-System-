const crypto = require("crypto");
const db     = require("../config/database");
const { asyncHandler } = require("../middleware/errorHandler");

/* ── helper: verify trip ownership ── */
const ownTrip = async (tripId, userId, res) => {
  const trip = await db.findById("trips", tripId);
  if (!trip) { res.status(404).json({ message: "Trip not found." }); return null; }
  if (trip.user_id !== userId) { res.status(403).json({ message: "Access denied." }); return null; }
  return trip;
};

/* ── POST /api/trips/:tripId/share
   Generate (or return existing) share link for a trip.               */
const generateShareLink = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.tripId, req.user.id, res);
  if (!trip) return;

  /* Reuse an existing non-expired token if one exists */
  const existing = await db.findOne("shared_trips", { trip_id: trip.id });
  if (existing && new Date(existing.expires_at) > new Date()) {
    const shareUrl = buildUrl(req, existing.share_token);
    return res.json({ message: "Share link already exists.", share_token: existing.share_token, share_url: shareUrl, expires_at: existing.expires_at });
  }

  /* Delete any stale/expired row first */
  if (existing) {
    await db.deleteWhere("shared_trips", { trip_id: trip.id });
  }

  const share_token = crypto.randomBytes(32).toString("hex");
  const expires_at  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 19).replace("T", " ");

  await db.insert("shared_trips", { trip_id: trip.id, share_token, expires_at });

  const shareUrl = buildUrl(req, share_token);
  res.status(201).json({ message: "Share link generated.", share_token, share_url: shareUrl, expires_at });
});

/* ── DELETE /api/trips/:tripId/share
   Revoke (delete) the share link for a trip.                         */
const revokeShareLink = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.tripId, req.user.id, res);
  if (!trip) return;

  const existing = await db.findOne("shared_trips", { trip_id: trip.id });
  if (!existing) {
    return res.status(404).json({ message: "No share link exists for this trip." });
  }

  await db.deleteWhere("shared_trips", { trip_id: trip.id });
  res.json({ message: "Share link revoked." });
});

/* ── GET /api/trips/:tripId/share  (PROTECTED — owner only)
   Return the active share token/url for a trip, if one exists.      */
const getShareStatus = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.tripId, req.user.id, res);
  if (!trip) return;

  const existing = await db.findOne("shared_trips", { trip_id: trip.id });
  if (!existing || new Date(existing.expires_at) < new Date()) {
    return res.status(404).json({ message: "No active share link." });
  }

  res.json({
    share_token: existing.share_token,
    share_url:   buildUrl(req, existing.share_token),
    expires_at:  existing.expires_at,
  });
});

/* ── GET /api/share/:token  (PUBLIC — no auth required)
   Return read-only trip data for a valid share token.                */
const getSharedTrip = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const shared = await db.findOne("shared_trips", { share_token: token });

  if (!shared || new Date(shared.expires_at) < new Date()) {
    return res.status(404).json({ message: "This share link is invalid or has expired." });
  }

  const trip = await db.findById("trips", shared.trip_id);
  if (!trip) {
    return res.status(404).json({ message: "Trip no longer exists." });
  }

  /* Destinations */
  const tripDests = await db.findAll("trip_destinations", { trip_id: trip.id });
  const destinations = (
    await Promise.all(tripDests.map((td) => db.findById("destinations", td.destination_id)))
  ).filter(Boolean);

  /* Itinerary — sorted chronologically */
  const itinerary = (await db.findAll("itinerary", { trip_id: trip.id })).sort(
    (a, b) =>
      new Date(`${a.activity_date}T${a.activity_time || "00:00"}`) -
      new Date(`${b.activity_date}T${b.activity_time || "00:00"}`)
  );

  /* Deliberately exclude budget & expenses per US-20 */
  res.json({
    trip: {
      id:           trip.id,
      name:         trip.name,
      start_date:   trip.start_date,
      end_date:     trip.end_date,
      destinations,
      itinerary,
    },
    expires_at: shared.expires_at,
  });
});

/* ── helper ── */
const buildUrl = (req, token) => {
  const base = "http://localhost/SE---Project-Travel-Planner-System-";
  return `${base}/shared-trip.html?token=${token}`;
};

module.exports = { generateShareLink, revokeShareLink, getSharedTrip, getShareStatus, viewSharedTrip: getSharedTrip };