

const db = require("../config/database");
const { asyncHandler } = require("../middleware/errorHandler");


const enrichTrip = async (trip) => {
  const expenses = await db.findAll("expenses", { trip_id: trip.id });
  const total_spent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining_budget =
    trip.budget != null ? Number(trip.budget) - total_spent : null;
  return { ...trip, total_spent, remaining_budget };
};

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

const getTrips = asyncHandler(async (req, res) => {
  const trips = await db.findAll("trips", { user_id: req.user.id });
  const enriched = await Promise.all(trips.map(enrichTrip));
  res.json({ trips: enriched });
});

const getTrip = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.id, req.user.id, res);
  if (!trip) return;

  const tripDests = await db.findAll("trip_destinations", { trip_id: trip.id });
  const destinations = (
    await Promise.all(tripDests.map((td) => db.findById("destinations", td.destination_id)))
  ).filter(Boolean);

  const itinerary = (await db.findAll("itinerary", { trip_id: trip.id })).sort(
    (a, b) =>
      new Date(`${a.activity_date}T${a.activity_time || "00:00"}`) -
      new Date(`${b.activity_date}T${b.activity_time || "00:00"}`)
  );

  const expenses = await db.findAll("expenses", { trip_id: trip.id });

  res.json({ trip: { ...(await enrichTrip(trip)), destinations, itinerary, expenses } });
});

const createTrip = asyncHandler(async (req, res) => {
  const { name, start_date, end_date, budget } = req.body;

  if (new Date(end_date) <= new Date(start_date)) {
    return res.status(400).json({ message: "End date must be after start date." });
  }

  const trip = await db.insert("trips", {
    user_id: req.user.id,
    name,
    start_date,
    end_date,
    budget: budget != null ? Number(budget) : null,
  });

  res.status(201).json({ message: "Trip created.", trip: await enrichTrip(trip) });
});

const updateTrip = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.id, req.user.id, res);
  if (!trip) return;

  const { name, start_date, end_date, budget } = req.body;

  const newStart = start_date || trip.start_date;
  const newEnd   = end_date   || trip.end_date;

  if (new Date(newEnd) <= new Date(newStart)) {
    return res.status(400).json({ message: "End date must be after start date." });
  }

  const updated = await db.update("trips", trip.id, {
    name:       name   || trip.name,
    start_date: newStart,
    end_date:   newEnd,
    budget:     budget != null ? Number(budget) : trip.budget,
  });

  res.json({ message: "Trip updated.", trip: await enrichTrip(updated) });
});

const deleteTrip = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.id, req.user.id, res);
  if (!trip) return;


  await db.deleteWhere("trip_destinations", { trip_id: trip.id });
  await db.deleteWhere("itinerary",         { trip_id: trip.id });
  await db.deleteWhere("expenses",          { trip_id: trip.id });
  await db.deleteWhere("notifications",     { trip_id: trip.id });
  await db.deleteWhere("shared_trips",      { trip_id: trip.id });
  await db.delete("trips", trip.id);

  res.json({ message: "Trip deleted." });
});

module.exports = { getTrips, getTrip, createTrip, updateTrip, deleteTrip };
