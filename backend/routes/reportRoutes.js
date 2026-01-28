const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

// Export routes - support both GET (legacy) and POST (with module selection)
router.get("/export/pdf", reportController.exportPDF);
router.get("/export/excel", reportController.exportExcel);

// New routes with module selection (POST)
router.post("/export/pdf", reportController.exportPDFWithModules);
router.post("/export/excel", reportController.exportExcelWithModules);

module.exports = router;
