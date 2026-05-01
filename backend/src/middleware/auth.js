
const jwt = require("jsonwebtoken");
const db  = require("../config/database");


const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided. Please log in." });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await db.findById("users", decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    const { password_hash, ...safeUser } = user;
    req.user = safeUser;

    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token. Please log in again." });
    }
    next(err);
  }
};

module.exports = { protect };
