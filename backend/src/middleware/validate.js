

const { body, param, validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: "Validation failed.",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};


const register = [
  body("first_name").trim().notEmpty().withMessage("First name is required."),
  body("last_name").trim().notEmpty().withMessage("Last name is required."),
  body("username")
    .trim()
    .notEmpty().withMessage("Username is required.")
    .isLength({ max: 50 }).withMessage("Username must be at most 50 characters."),
  body("email")
    .trim()
    .isEmail().withMessage("A valid email address is required.")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/[A-Za-z]/).withMessage("Password must contain at least one letter.")
    .matches(/[0-9]/).withMessage("Password must contain at least one number."),
  handleValidationErrors,
];

const login = [
  body("email").trim().isEmail().withMessage("A valid email address is required.").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required."),
  handleValidationErrors,
];

const updateProfile = [
  body("email").optional().trim().isEmail().withMessage("A valid email address is required.").normalizeEmail(),
  body("new_password")
    .optional()
    .isLength({ min: 8 }).withMessage("New password must be at least 8 characters.")
    .matches(/[A-Za-z]/).withMessage("Password must contain at least one letter.")
    .matches(/[0-9]/).withMessage("Password must contain at least one number."),
  handleValidationErrors,
];

const requestPasswordReset = [
  body("email").trim().isEmail().withMessage("A valid email address is required.").normalizeEmail(),
  handleValidationErrors,
];

const resetPassword = [
  body("token").notEmpty().withMessage("Reset token is required."),
  body("new_password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/[A-Za-z]/).withMessage("Password must contain at least one letter.")
    .matches(/[0-9]/).withMessage("Password must contain at least one number."),
  handleValidationErrors,
];

// ─── Trips ────────────────────────────────────────────────────────────────────

const createTrip = [
  body("name").trim().notEmpty().withMessage("Trip name is required."),
  body("start_date").isDate().withMessage("start_date must be a valid date (YYYY-MM-DD)."),
  body("end_date").isDate().withMessage("end_date must be a valid date (YYYY-MM-DD)."),
  body("budget")
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage("Budget must be a non-negative number."),
  handleValidationErrors,
];

const updateTrip = [
  body("name").optional().trim().notEmpty().withMessage("Trip name cannot be empty."),
  body("start_date").optional().isDate().withMessage("start_date must be a valid date (YYYY-MM-DD)."),
  body("end_date").optional().isDate().withMessage("end_date must be a valid date (YYYY-MM-DD)."),
  body("budget")
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage("Budget must be a non-negative number."),
  handleValidationErrors,
];


const createActivity = [
  body("title").trim().notEmpty().withMessage("Activity title is required."),
  body("activity_date").isDate().withMessage("activity_date must be a valid date (YYYY-MM-DD)."),
  body("activity_time")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("activity_time must be in HH:MM (24-hour) format."),
  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description must be at most 1000 characters."),
  handleValidationErrors,
];

const updateActivity = [
  body("title").optional().trim().notEmpty().withMessage("Activity title cannot be empty."),
  body("activity_date").optional().isDate().withMessage("activity_date must be a valid date."),
  body("activity_time")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("activity_time must be in HH:MM (24-hour) format."),
  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description must be at most 1000 characters."),
  handleValidationErrors,
];


const createExpense = [
  body("amount")
    .isFloat({ min: 0.01, max: 999999 })
    .withMessage("Amount must be between 0.01 and 999,999."),
  body("category")
    .isIn(["transport", "accommodation", "food", "activities", "other"])
    .withMessage("Category must be one of: transport, accommodation, food, activities, other."),
  body("description")
    .optional()
    .isLength({ max: 255 })
    .withMessage("Description must be at most 255 characters."),
  handleValidationErrors,
];


const createReview = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5."),
  body("comment")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Comment must be at most 2000 characters."),
  handleValidationErrors,
];


const idParam = (name = "id") => [
  param(name).isInt({ min: 1 }).withMessage(`${name} must be a positive integer.`),
  handleValidationErrors,
];

module.exports = {
  register,
  login,
  updateProfile,
  requestPasswordReset,
  resetPassword,
  createTrip,
  updateTrip,
  createActivity,
  updateActivity,
  createExpense,
  createReview,
  idParam,
};
