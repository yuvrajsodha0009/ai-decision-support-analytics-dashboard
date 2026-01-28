const mongoose = require("mongoose");
require("dotenv").config();
const Sales = require("./models/Sales");

const salesSeed = [
  {
    date: new Date("2024-01-10"),
    product: "Laptop",
    quantity: 2,
    price: 50000,
    revenue: 100000,
    region: "India",
    channel: "online",
    batchId: "seed-jan"
  },
  {
    date: new Date("2024-02-15"),
    product: "Mobile",
    quantity: 3,
    price: 20000,
    revenue: 60000,
    region: "India",
    channel: "retail",
    batchId: "seed-feb"
  },
  {
    date: new Date("2024-03-05"),
    product: "Headphones",
    quantity: 5,
    price: 2000,
    revenue: 10000,
    region: "US",
    channel: "online",
    batchId: "seed-mar"
  }
];

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Optional: clear existing data
    // await Sales.deleteMany({});

    await Sales.insertMany(salesSeed);

    console.log("✅ Sales data seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedDB();
