const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const Data = require("../models/Data");
const crypto = require("crypto");
const {
  updateDataRecord,
  getDataHistory,
  rollbackDataRecord,
  getBatchVersions,
  deleteDataRecord
} = require("../controllers/versioningController");


const router = express.Router();
const upload = multer({ dest: "uploads/" });

//post data
router.post("/upload-csv", upload.single("file"), (req, res) => {
  const results = [];
  const batchId = crypto.randomUUID();
    //console.log("BATCH ID:", batchId);
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => {
      results.push({
        title: row.title,
        value: Number(row.value),
        batchId,
        source: "csv",
        rawData: row,
        version: 1
      });
    })
    .on("end", async () => {
      await Data.insertMany(results);
      fs.unlinkSync(req.file.path);
      res.json({ message: "CSV uploaded", batchId });
    });
});

//batch route
router.get("/batches", async (req, res) => {
  const batches = await Data.aggregate([
    {
      $match: { batchId: { $exists: true } }
    },
    {
      $group: {
        _id: "$batchId",
        uploadedAt: { $first: "$uploadedAt" }
      }
    },
    { $sort: { uploadedAt: -1 } }
  ]);

  res.json(batches);
});



//get Data
router.get("/all", async (req, res) => {
  const data = await Data.find({ isActive: true });
  res.json(data);
});

// Get data by batch (FILTER)
router.get("/batch/:batchId", async (req, res) => {
  const { batchId } = req.params;

  const data = await Data.find({ batchId, isActive: true });

  res.json(data);
});


// Delete a CSV batch safely
router.delete("/batch/:batchId", async (req, res) => {
  const { batchId } = req.params;

  await Data.deleteMany({ batchId });

  res.json({
    message: `Batch ${batchId} deleted successfully`
  });
});

// Versioning routes
// Update a data record with versioning
router.put("/:id", updateDataRecord);

// Get version history for a data record
router.get("/:id/history", getDataHistory);

// Rollback a data record to a specific version
router.post("/:id/rollback/:version", rollbackDataRecord);

// Get all versions for a batch
router.get("/batch/:batchId/versions", getBatchVersions);

// Soft delete a data record
router.delete("/:id", deleteDataRecord);

module.exports = router;   
