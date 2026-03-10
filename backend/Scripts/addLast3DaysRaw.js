require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env")
});

const mongoose = require("mongoose");
const RawSale = require("../models/RawSale");

const DEVICES = ["mobile", "desktop", "tablet"];
const TRAFFIC = ["google", "facebook", "direct"];

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = arr => arr[Math.floor(Math.random() * arr.length)];


// 🔹 Minimal product generator (lightweight version)
function generateProduct() {
  return {
    productId: `P-${randomInt(100000, 999999)}`,
    productName: "Demo Product",
    category: "Electronics",
    subcategory: "Mobile",
    brand: "Samsung"
  };
}


// 🔹 Generate only last 3 days
function generateLast3Days() {
  const bulk = [];

  const DAYS = 3;

  for (let d = 2; d >= 0; d--) {  // 2,1,0 = last 3 days
    for (let h = 0; h < 24; h++) {

      const baseTime = new Date();
      baseTime.setUTCDate(baseTime.getUTCDate() - d);
      baseTime.setUTCHours(h, 0, 0, 0);

      const salesPerHour = randomInt(6, 15);

      for (let i = 0; i < salesPerHour; i++) {

        const price = randomInt(100, 800);
        const quantity = randomInt(1, 3);
        const cost = Math.floor(price * 0.6);
        const discountAmount = randomInt(0, 30);
        const taxAmount = randomInt(0, 15);
        const shippingCost = randomInt(0, 20);

        const revenue = quantity * price - discountAmount;
        const profit = revenue - quantity * cost - shippingCost;

        const year = baseTime.getUTCFullYear();
        const month = baseTime.getUTCMonth() + 1;
        const day = baseTime.getUTCDate();
        const hour = baseTime.getUTCHours();
        const quarter = Math.floor((month - 1) / 3) + 1;

        bulk.push({
          transactionId: `TX-${Date.now()}-${Math.random()}`,
          timestamp: new Date(baseTime),

          product: generateProduct(),

          customer: {
            customerId: `C-${randomInt(100000, 999999)}`,
            customerType: pick(["new", "returning"])
          },

          geography: {
            region: "Asia",
            country: "India",
            city: "Mumbai"
          },

          marketing: {
            trafficSource: pick(TRAFFIC),
            campaignId: `CMP-${randomInt(1, 5)}`,
            deviceType: pick(DEVICES)
          },

          quantity,
          price,
          cost,
          discountAmount,
          taxAmount,
          shippingCost,

          revenue,
          profit,

          orderStatus: "completed",
          isTestData: true,

          year,
          month,
          day,
          hour,
          quarter
        });
      }
    }
  }

  return bulk;
}


// 🔹 Insert only new data (no delete)
async function seedLast3Days() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const salesSeed = generateLast3Days();

    console.log(`📦 Inserting ${salesSeed.length} records...`);
    await RawSale.insertMany(salesSeed, { ordered: false });

    console.log("✅ Last 3 days data inserted successfully");
    process.exit(0);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedLast3Days();