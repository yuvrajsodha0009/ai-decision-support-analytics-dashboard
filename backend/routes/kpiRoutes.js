const express = require("express");
const auth = require("../middleware/authMiddleware");
const {
  createKPI,
  computeKPIs,
  getBatchIds,
  deleteKPI
} = require("../controllers/kpiController");

const router = express.Router();

router.post("/", auth, createKPI);
router.get("/compute", auth, computeKPIs);
router.get("/batches", auth, getBatchIds);
router.delete("/:id", auth, deleteKPI);

module.exports = router;
