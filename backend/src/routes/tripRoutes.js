

const router      = require("express").Router();
const trips       = require("../controllers/tripController");
const itinerary   = require("../controllers/itineraryController");
const expenses    = require("../controllers/expenseController");
const destinations = require("../controllers/destinationController");
const share       = require("../controllers/shareController");
const { protect } = require("../middleware/auth");
const validate    = require("../middleware/validate");

router.use(protect);

router.get   ("/",           trips.getTrips);
router.post  ("/",           validate.createTrip,  trips.createTrip);
router.get   ("/:id",        trips.getTrip);
router.put   ("/:id",        validate.updateTrip,  trips.updateTrip);
router.delete("/:id",        trips.deleteTrip);

router.post  ("/:tripId/share",  share.generateShareLink);
router.delete("/:tripId/share",  share.revokeShareLink);

router.post  ("/:tripId/destinations",                     destinations.addDestinationToTrip);
router.delete("/:tripId/destinations/:destinationId",      destinations.removeDestinationFromTrip);

router.get   ("/:tripId/itinerary",      itinerary.getItinerary);
router.post  ("/:tripId/itinerary",      validate.createActivity, itinerary.createActivity);
router.put   ("/:tripId/itinerary/:id",  validate.updateActivity, itinerary.updateActivity);
router.delete("/:tripId/itinerary/:id",  itinerary.deleteActivity);

router.get   ("/:tripId/budget",        expenses.getBudget);
router.put   ("/:tripId/budget",        expenses.setBudget);
router.get   ("/:tripId/expenses",      expenses.getExpenses);
router.post  ("/:tripId/expenses",      validate.createExpense, expenses.addExpense);
router.delete("/:tripId/expenses/:id",  expenses.deleteExpense);

module.exports = router;
