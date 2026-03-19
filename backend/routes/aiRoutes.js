const express = require("express");

const auth = require("../middleware/authMiddleware");
const { getAIInsight } = require("../controllers/aiController");

const router = express.Router();

router.post("/insight", auth, getAIInsight);

module.exports = router;
