const express = require("express");
const auth = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const {
  getAdminSales,
  exportAdminSales,
} = require("../controllers/adminSalesController");

const router = express.Router();

router.use(auth, adminOnly);

router.get("/", getAdminSales);
router.get("/export", exportAdminSales);

module.exports = router;

