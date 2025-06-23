const express = require("express");
const app = express();
const cors = require("cors");
const priceRoutes = require("./routes/priceRoutes");

// setup middlewares
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  return res.json({ message: "hello world" });
});

app.get("/api/test", (req, res) => {
  return res.json({ message: "welcome to price checker" });
});

app.use("/api/jobs/check-price", priceRoutes);

module.exports = app;
