// server/routes/alerts.routes.js
const express = require("express");
const { getPriceDrops } = require("../controllers/alerts.controller");

const router = express.Router();

// GET /api/alerts/price-drops?hours=24&store=prettylittlething
router.get("/price-drops", getPriceDrops);

module.exports = router;
