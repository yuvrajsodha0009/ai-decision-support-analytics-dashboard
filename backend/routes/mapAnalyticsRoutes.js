const express = require("express");
const auth = require("../middleware/authMiddleware");
const { getMapAnalytics } = require("../controllers/mapAnalyticsController");

const router = express.Router();

router.use(auth);
router.get("/map-analytics", getMapAnalytics);

module.exports = router;
