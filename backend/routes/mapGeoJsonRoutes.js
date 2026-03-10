const express = require("express");
const auth = require("../middleware/authMiddleware");
const { getMapGeoJson } = require("../controllers/mapGeoJsonController");

const router = express.Router();

router.use(auth);
router.get("/map-geojson", getMapGeoJson);

module.exports = router;
