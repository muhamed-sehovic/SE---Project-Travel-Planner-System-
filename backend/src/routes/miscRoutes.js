
const router        = require("express").Router();
const destinations  = require("../controllers/destinationController");
const reviews       = require("../controllers/reviewController");
const notifications = require("../controllers/notificationController");
const share         = require("../controllers/shareController");
const { protect }   = require("../middleware/auth");
const validate      = require("../middleware/validate");

router.get ("/favourites",                 protect, destinations.getFavourites);
router.post("/favourites/:destinationId",    protect, destinations.toggleFavourite);

router.put   ("/reviews/:id", protect, validate.createReview, reviews.updateReview);
router.delete("/reviews/:id", protect, reviews.deleteReview);

router.get   ("/notifications",             protect, notifications.getNotifications);
router.put   ("/notifications/read-all",    protect, notifications.markAllRead);
router.put   ("/notifications/settings",    protect, notifications.updateNotificationSettings);
router.put   ("/notifications/:id/read",    protect, notifications.markRead);
router.delete("/notifications/:id",         protect, notifications.deleteNotification);

router.get("/share/:token", share.viewSharedTrip);

module.exports = router;
