const express = require("express");
const auth = require("../middleware/authMiddleware");
const {
  getCategoryAnalytics,
} = require("../controllers/categoryAnalyticsController");

const router = express.Router();

router.use(auth);

router.get("/category-analytics/:categoryName", getCategoryAnalytics);

module.exports = router;
