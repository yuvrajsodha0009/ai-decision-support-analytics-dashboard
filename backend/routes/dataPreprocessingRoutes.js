const express = require("express");
const {
  upload,
  preprocessBatchData,
  exportPDF,
  exportExcel,
  getProcessedData,
} = require("../controllers/dataPreprocessingController");

const router = express.Router();

// Health check
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.post("/preprocess", upload.single("file"), preprocessBatchData);
router.get("/export/pdf", exportPDF);
router.get("/export/excel", exportExcel);
router.get("/processed-data", getProcessedData);

module.exports = router;
