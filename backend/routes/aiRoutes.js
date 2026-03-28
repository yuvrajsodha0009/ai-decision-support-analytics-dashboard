const express = require("express");

const auth = require("../middleware/authMiddleware");
const { getAIInsight } = require("../controllers/aiController");
const { askAgent } = require("../controllers/askAgentController");

const router = express.Router();

router.post("/insight", auth, getAIInsight);
router.post("/summary", auth, getAIInsight);
router.post("/ask-agent", auth, askAgent);

module.exports = router;
