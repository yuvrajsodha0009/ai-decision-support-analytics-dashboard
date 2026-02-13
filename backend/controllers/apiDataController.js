const axios = require("axios");
const crypto = require("crypto");
const ApiData = require("../models/ApiData");
const logActivity = require("../utils/logActivity");

exports.fetchApiData = async (req, res) => {
  try {
    const batchId = crypto.randomUUID();

    const apiRes = await axios.get(
      "https://dummyjson.com/products?limit=10"
    );

    const records = apiRes.data.products.map(item => ({
      title: item.title,
      value: item.price * item.stock,
      batchId,
      rawData: item
    }));

    await ApiData.insertMany(records);

    await logActivity(
      req.userId ? "User" : "System",
      "API Data Fetched",
      "API Data",
      `Fetched ${records.length} records (batch ${batchId})`,
      "success",
      req
    );

    res.json({
      success: true,
      batchId,
      records: records.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
