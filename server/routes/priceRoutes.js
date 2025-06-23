const { Router } = require("express");
const { checkPrice } = require("../controllers/priceCheckerController");

const router = Router();

router.get("/", (req, res) => {
  return res.json({ message: "hello world" });
});

router.post("/", checkPrice);

module.exports = router;
