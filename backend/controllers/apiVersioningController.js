const ApiData = require("../models/ApiData");
const ApiDataHistory = require("../models/ApiDataHistory");

/**
 * Update an API data record with versioning
 */
exports.updateApiDataRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, value, rawData, changeReason, changedBy } = req.body;

    // Find the current record
    const currentRecord = await ApiData.findById(id);
    if (!currentRecord) {
      return res.status(404).json({ message: "API data record not found" });
    }

    // Save current state to history
    const historyEntry = new ApiDataHistory({
      apiDataId: id,
      version: currentRecord.version,
      title: currentRecord.title,
      value: currentRecord.value,
      source: currentRecord.source,
      batchId: currentRecord.batchId,
      rawData: currentRecord.rawData,
      changedBy: changedBy || "system",
      changeType: "update",
      changeReason: changeReason || "Record updated"
    });
    await historyEntry.save();

    // Update the record with new version
    const updatedRecord = await ApiData.findByIdAndUpdate(
      id,
      {
        title: title !== undefined ? title : currentRecord.title,
        value: value !== undefined ? value : currentRecord.value,
        rawData: rawData !== undefined ? rawData : currentRecord.rawData,
        version: currentRecord.version + 1,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      message: "API data record updated successfully",
      data: updatedRecord,
      previousVersion: currentRecord.version
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get version history for an API data record
 */
exports.getApiDataHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await ApiDataHistory.find({ apiDataId: id }).sort({ version: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Rollback an API data record to a specific version
 */
exports.rollbackApiDataRecord = async (req, res) => {
  try {
    const { id, version } = req.params;

    // Find the history entry for the specified version
    const historyEntry = await ApiDataHistory.findOne({ apiDataId: id, version: parseInt(version) });
    if (!historyEntry) {
      return res.status(404).json({ message: "Version not found" });
    }

    // Update the current record to match the history entry
    const updatedRecord = await ApiData.findByIdAndUpdate(
      id,
      {
        title: historyEntry.title,
        value: historyEntry.value,
        rawData: historyEntry.rawData,
        version: historyEntry.version,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      message: "Record rolled back successfully",
      data: updatedRecord
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all versions for an API data batch
 */
exports.getApiDataBatchVersions = async (req, res) => {
  try {
    const { batchId } = req.params;
    const versions = await ApiDataHistory.aggregate([
      { $match: { batchId } },
      {
        $group: {
          _id: "$version",
          records: { $push: "$$ROOT" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": -1 } }
    ]);
    res.json(versions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Soft delete an API data record
 */
exports.deleteApiDataRecord = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the current record
    const currentRecord = await ApiData.findById(id);
    if (!currentRecord) {
      return res.status(404).json({ message: "API data record not found" });
    }

    // Save to history before deleting
    const historyEntry = new ApiDataHistory({
      apiDataId: id,
      version: currentRecord.version,
      title: currentRecord.title,
      value: currentRecord.value,
      source: currentRecord.source,
      batchId: currentRecord.batchId,
      rawData: currentRecord.rawData,
      changedBy: "system",
      changeType: "delete",
      changeReason: "Record soft deleted"
    });
    await historyEntry.save();

    // Soft delete
    await ApiData.findByIdAndUpdate(id, { isActive: false });

    res.json({ message: "API data record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};