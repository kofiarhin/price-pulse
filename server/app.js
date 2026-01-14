// server/app.js
const express = require("express");
const alertsRoutes = require("./routes/alerts.routes");

const app = express();

app.use(express.json());

app.get("/", async (req, res) => {
  return res.json({ message: "hello world" });
});

// drops endpoint:
// GET /api/alerts/price-drops?hours=24&store=prettylittlething
app.use("/api/alerts", alertsRoutes);

module.exports = app;
