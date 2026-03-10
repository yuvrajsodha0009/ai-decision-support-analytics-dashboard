const express = require("express");
const multer = require("multer");
const {
  initUploadSession,
  validateUploadSession,
  commitUploadSession,
  listSources,
  listDatasets,
  listBusinessRecords,
  softDeleteDataset,
  restoreDataset,
  getAnalyticsSummary,
} = require("../controllers/csvController");

const router = express.Router();
const upload = multer({ dest: "uploads/" });
const auth = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/checkRole");
const { ROLES } = require("../utils/roles");

// Upload endpoints: Manager/Admin may create/commit uploads
router.post(
  "/uploads/init",
  auth,
  checkRole([ROLES.MANAGER, ROLES.ADMIN]),
  upload.single("file"),
  initUploadSession,
);
router.post("/uploads/validate", auth, checkRole([ROLES.MANAGER, ROLES.ADMIN]), validateUploadSession);
router.post("/uploads/commit", auth, checkRole([ROLES.MANAGER, ROLES.ADMIN]), commitUploadSession);

router.get("/sources", listSources);
router.get("/datasets", listDatasets);
router.get("/records", listBusinessRecords);
// Dataset deletion: Admin only
router.delete("/dataset/:id", auth, checkRole([ROLES.ADMIN]), softDeleteDataset);
router.post("/dataset/:id/restore", restoreDataset);
router.get("/analytics/summary", getAnalyticsSummary);

module.exports = router;
