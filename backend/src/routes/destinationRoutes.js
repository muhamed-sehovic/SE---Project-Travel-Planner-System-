

const router       = require("express").Router();
const destinations = require("../controllers/destinationController");
const reviews      = require("../controllers/reviewController");
const { protect }  = require("../middleware/auth");
const validate     = require("../middleware/validate");

router.get("/search",           protect, destinations.searchDestinations);
router.get("/recommendations",  protect, destinations.getRecommendations);
router.get("/:id",              protect, destinations.getDestination);

router.get ("/:destinationId/reviews", protect, reviews.getReviews);
router.post("/:destinationId/reviews", protect, validate.createReview, reviews.createReview);

module.exports = router;
