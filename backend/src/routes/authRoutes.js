

const router     = require("express").Router();
const auth       = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const validate   = require("../middleware/validate");

router.post("/register",         validate.register,              auth.register);
router.post("/login",            validate.login,                 auth.login);
router.post("/logout",           protect,                        auth.logout);
router.get ("/me",               protect,                        auth.getMe);
router.put ("/me",               protect, validate.updateProfile, auth.updateProfile);
router.post("/forgot-password",  validate.requestPasswordReset,  auth.requestPasswordReset);
router.post("/reset-password",   validate.resetPassword,         auth.resetPassword);

module.exports = router;
