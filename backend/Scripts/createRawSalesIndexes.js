require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const RawSale = require("../models/RawSale");

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    await RawSale.syncIndexes();
    const indexes = await RawSale.collection.indexes();
    console.log("RawSale indexes synced");
    console.log(indexes.map((idx) => idx.name).join("\n"));

    process.exit(0);
  } catch (error) {
    console.error("Failed to sync RawSale indexes:", error);
    process.exit(1);
  }
}

createIndexes();

