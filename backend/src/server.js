

require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");

const authRoutes        = require("./routes/authRoutes");
const tripRoutes        = require("./routes/tripRoutes");
const destinationRoutes = require("./routes/destinationRoutes");
const miscRoutes        = require("./routes/miscRoutes");
const { errorHandler }  = require("./middleware/errorHandler");

const app  = express();
const PORT = process.env.PORT || 8080;

app.use(helmet());         
app.use(cors({
  origin: "*",
  credentials: true,
}));
app.use(express.json());    

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth",         authRoutes);
app.use("/api/trips",        tripRoutes);
app.use("/api/destinations", destinationRoutes);
app.use("/api",              miscRoutes);   

app.use((_req, res) => res.status(404).json({ message: "Route not found." }));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Travel Planner API running on port ${PORT}`);
});

module.exports = app;
