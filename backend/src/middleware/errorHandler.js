
/**
 * Wraps an async Express route handler and forwards any rejected promise
 * to next() so the global errorHandler can deal with it.
 *
 * @param {Function} fn  async (req, res, next) => { ... }
 * @returns {Function}
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Global Express error handler.
 * Mount AFTER all routes: app.use(errorHandler)
 *
 * @param {Error}  err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.error("[ERROR]", err);
  }

  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ message: "A record with that value already exists." });
  }

  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ message: "Referenced resource does not exist." });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid token." });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired. Please log in again." });
  }

  const status  = err.statusCode || err.status || 500;
  const message = err.message    || "Internal server error.";
  res.status(status).json({ message });
};

module.exports = { asyncHandler, errorHandler };
