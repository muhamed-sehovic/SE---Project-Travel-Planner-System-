const router = require("express").Router();
const share  = require("../controllers/shareController");

/* Public — no auth middleware */
router.get("/:token", share.getSharedTrip);

module.exports = router;