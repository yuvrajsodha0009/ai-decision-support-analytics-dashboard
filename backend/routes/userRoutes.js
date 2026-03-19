const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getMe,
  updateProfile,
  changePassword,
  updateAvatar,
  updateAnalyticsDateRangePreference,
} = require("../controllers/userController");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

const avatarDir = path.join(__dirname, "..", "uploads", "avatars");
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const safeExt = allowed.includes(ext) ? ext : ".png";
    cb(null, `avatar-${req.userId}-${Date.now()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    return cb(null, true);
  },
});

router.get("/me", auth, getMe);
router.put("/update-profile", auth, updateProfile);
router.put("/change-password", auth, changePassword);
router.put("/preferences/date-range", auth, updateAnalyticsDateRangePreference);
router.put(
  "/update-avatar",
  auth,
  (req, res, next) => {
    upload.single("avatar")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      return next();
    });
  },
  updateAvatar
);

module.exports = router;
