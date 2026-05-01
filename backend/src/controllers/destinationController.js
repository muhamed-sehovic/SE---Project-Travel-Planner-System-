

const db = require("../config/database");
const { asyncHandler } = require("../middleware/errorHandler");


const searchDestinations = asyncHandler(async (req, res) => {
  const query = (req.query.q || "").trim();

  if (query.length < 2) {
    return res.status(400).json({ message: "Search query must be at least 2 characters." });
  }

  const [rows] = await db.pool.query(
    `SELECT * FROM destinations
      WHERE name    LIKE ?
         OR country LIKE ?
      ORDER BY name
      LIMIT 20`,
    [`%${query}%`, `%${query}%`]
  );

  if (rows.length === 0) {
    return res.json({ destinations: [], message: "No results found." });
  }

  res.json({ destinations: rows });
});

const getDestination = asyncHandler(async (req, res) => {
  const destination = await db.findById("destinations", parseInt(req.params.id, 10));
  if (!destination) {
    return res.status(404).json({ message: "Destination not found." });
  }
  res.json({ destination });
});


const addDestinationToTrip = asyncHandler(async (req, res) => {
  const tripId        = parseInt(req.params.tripId, 10);
  const { destination_id } = req.body;

  if (!destination_id) {
    return res.status(400).json({ message: "destination_id is required." });
  }

  const trip = await db.findById("trips", tripId);
  if (!trip) return res.status(404).json({ message: "Trip not found." });
  if (trip.user_id !== req.user.id) return res.status(403).json({ message: "Access denied." });

  const destination = await db.findById("destinations", destination_id);
  if (!destination) return res.status(404).json({ message: "Destination not found." });

  const existing = await db.findAll("trip_destinations", { trip_id: tripId });
  if (existing.length >= 20) {
    return res.status(400).json({ message: "A trip can have a maximum of 20 destinations." });
  }

  const duplicate = existing.find((td) => td.destination_id === destination_id);
  if (duplicate) {
    return res.status(409).json({ message: "Destination already added to this trip." });
  }

  await db.insert("trip_destinations", { trip_id: tripId, destination_id });

  res.status(201).json({
    message: "Destination added to trip.",
    destination,
  });
});


const removeDestinationFromTrip = asyncHandler(async (req, res) => {
  const tripId        = parseInt(req.params.tripId, 10);
  const destinationId = parseInt(req.params.destinationId, 10);

  const trip = await db.findById("trips", tripId);
  if (!trip) return res.status(404).json({ message: "Trip not found." });
  if (trip.user_id !== req.user.id) return res.status(403).json({ message: "Access denied." });

  await db.deleteWhere("trip_destinations", { trip_id: tripId, destination_id: destinationId });

  res.json({ message: "Destination removed from trip." });
});


const toggleFavourite = asyncHandler(async (req, res) => {
  const destinationId = parseInt(req.params.destinationId, 10);
  const userId = req.user.id;

  const destination = await db.findById("destinations", destinationId);
  if (!destination) return res.status(404).json({ message: "Destination not found." });

  const existing = await db.findOne("favourites", { user_id: userId, destination_id: destinationId });

  if (existing) {
    await db.delete("favourites", existing.id);
    return res.json({ message: "Removed from favourites.", favourite: false });
  }

  await db.insert("favourites", { user_id: userId, destination_id: destinationId });
  res.status(201).json({ message: "Saved to favourites.", favourite: true, destination });
});


const getFavourites = asyncHandler(async (req, res) => {
  const favRecords = await db.findAll("favourites", { user_id: req.user.id });

  const destinations = (
    await Promise.all(favRecords.map((f) => db.findById("destinations", f.destination_id)))
  ).filter(Boolean);

  res.json({ favourites: destinations });
});


const getRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const currentTripId = req.query.trip_id ? parseInt(req.query.trip_id, 10) : null;

  const favRecords = await db.findAll("favourites", { user_id: userId });
  const favDestIds = favRecords.map((f) => f.destination_id);

  let countries = [];
  if (favDestIds.length > 0) {
    const favDests = (
      await Promise.all(favDestIds.map((id) => db.findById("destinations", id)))
    ).filter(Boolean);
    countries = [...new Set(favDests.map((d) => d.country))];
  }

  let excludeIds = [...favDestIds]; // already favourited — still show if relevant
  if (currentTripId) {
    const tripDests = await db.findAll("trip_destinations", { trip_id: currentTripId });
    excludeIds = [...new Set([...excludeIds, ...tripDests.map((td) => td.destination_id)])];
  }

  let recommendations = [];

  if (countries.length > 0) {
    const placeholders = countries.map(() => "?").join(", ");
    const excludePlaceholders = excludeIds.length > 0
      ? `AND id NOT IN (${excludeIds.map(() => "?").join(", ")})`
      : "";

    const [rows] = await db.pool.query(
      `SELECT * FROM destinations
        WHERE country IN (${placeholders})
        ${excludePlaceholders}
        ORDER BY RAND()
        LIMIT 10`,
      [...countries, ...excludeIds]
    );
    recommendations = rows;
  }

  if (recommendations.length < 3) {
    const excludePlaceholders = excludeIds.length > 0
      ? `WHERE id NOT IN (${excludeIds.map(() => "?").join(", ")})`
      : "";

    const [rows] = await db.pool.query(
      `SELECT * FROM destinations ${excludePlaceholders} ORDER BY RAND() LIMIT 10`,
      excludeIds
    );
    const existing = new Set(recommendations.map((r) => r.id));
    for (const row of rows) {
      if (!existing.has(row.id)) recommendations.push(row);
      if (recommendations.length >= 10) break;
    }
  }

  res.json({ recommendations: recommendations.slice(0, 10) });
});

module.exports = {
  searchDestinations,
  getDestination,
  addDestinationToTrip,
  removeDestinationFromTrip,
  toggleFavourite,
  getFavourites,
  getRecommendations,
};
