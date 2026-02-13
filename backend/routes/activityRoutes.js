const express = require("express");
const auth = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const {
  getAllActivities,
  clearAllActivities,
} = require("../controllers/activityController");

const router = express.Router();

router.get("/all", auth, adminOnly, getAllActivities);
router.delete("/all", auth, adminOnly, clearAllActivities);

module.exports = router;
