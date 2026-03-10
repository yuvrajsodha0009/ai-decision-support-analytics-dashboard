require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env")
});

const mongoose = require("mongoose");
const RawSale = require("../models/RawSale");
const { Country, State, City } = require("country-state-city");
const cron = require("node-cron");

// =====================================================
// 🛠 Utilities
// =====================================================

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const RETURNING_REUSE_RATE = 0.35;
const CUSTOMER_POOL = [];
const CUSTOMER_POOL_SET = new Set();

function createUniqueCustomerId() {
  let customerId = "";
  do {
    customerId = `C-${randomInt(100000, 999999)}`;
  } while (CUSTOMER_POOL_SET.has(customerId));

  CUSTOMER_POOL_SET.add(customerId);
  CUSTOMER_POOL.push(customerId);
  return customerId;
}

// Reuse existing IDs for returning users so returning-customer analytics stay realistic.
function getCustomerProfile() {
  const shouldReuse =
    CUSTOMER_POOL.length > 0 && Math.random() < RETURNING_REUSE_RATE;

  if (shouldReuse) {
    return {
      customerId: pick(CUSTOMER_POOL),
      customerType: "returning",
    };
  }

  return {
    customerId: createUniqueCustomerId(),
    customerType: "new",
  };
}

function weightedPick(weightMap) {
  const entries = Object.entries(weightMap);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  const r = Math.random() * total;
  let cumulative = 0;
  for (const [key, weight] of entries) {
    cumulative += weight;
    if (r <= cumulative) return key;
  }
  return entries[0][0];
}

// =====================================================
// 📊 SAME REALISM CONFIG AS HISTORICAL
// =====================================================

const CATEGORY_WEIGHTS = {
  Electronics: 28,
  Fashion: 22,
  "Home & Kitchen": 16,
  Grocery: 14,
  Beauty: 8,
  Sports: 7,
  Books: 5
};

const REGION_WEIGHTS = {
  Asia: 40,
  Europe: 25,
  "North America": 20,
  Africa: 10,
  Oceania: 5
};

const ORDER_STATUS_WEIGHTS = {
  completed: 85,
  cancelled: 5,
  returned: 5,
  pending: 5
};

// =====================================================
// 🛍 PRODUCT CATALOG (SAME)
// =====================================================

const PRODUCT_CATALOG = { /* KEEP SAME AS YOUR FILE */
   Electronics: {
    subcategories: {
      Mobile: ["Apple", "Samsung", "Xiaomi", "OnePlus", "Google"],
      Laptop: ["Dell", "HP", "Apple", "Lenovo", "Asus"],
      TV: ["Sony", "Samsung", "LG", "TCL"],
      Camera: ["Canon", "Nikon", "Sony"],
      Headphones: ["Bose", "Sony", "JBL", "Sennheiser"]
    }
  },
  Fashion: {
    subcategories: {
      Shirt: ["Nike", "Adidas", "Zara", "H&M"],
      Jeans: ["Levis", "Wrangler", "Lee"],
      Shoes: ["Nike", "Adidas", "Puma", "Reebok"],
      Jacket: ["North Face", "Columbia", "Zara"]
    }
  },
  "Home & Kitchen": {
    subcategories: {
      Furniture: ["Ikea", "Ashley", "Wayfair"],
      Appliances: ["LG", "Whirlpool", "Samsung"],
      Cookware: ["Prestige", "Tefal", "Cuisinart"],
      Decor: ["Home Centre", "Ikea"]
    }
  },
  Beauty: {
    subcategories: {
      Makeup: ["Maybelline", "Loreal", "MAC"],
      Skincare: ["Nivea", "Cetaphil", "Garnier"],
      Fragrance: ["Dior", "Chanel", "Armani"]
    }
  },
  Sports: {
    subcategories: {
      Fitness: ["Decathlon", "Nike", "Adidas"],
      Outdoor: ["Columbia", "Patagonia"],
      Cycling: ["Giant", "Trek"]
    }
  },
  Books: {
    subcategories: {
      Fiction: ["Penguin", "HarperCollins"],
      NonFiction: ["OReilly", "Pearson"],
      Academic: ["McGraw Hill", "Pearson"]
    }
  },
  Grocery: {
    subcategories: {
      Snacks: ["Lays", "Doritos", "Pringles"],
      Beverages: ["CocaCola", "Pepsi", "RedBull"],
      Dairy: ["Amul", "Nestle"]
    }
  }
 };
 // =====================================================
// ⚡ GEO CACHING (FAST)
// =====================================================

const ALL_COUNTRIES = Country.getAllCountries();
const REGION_COUNTRY_MAP = {};
const COUNTRY_CITY_CACHE = {};
const COUNTRY_STATE_NAME_CACHE = {};

for (const country of ALL_COUNTRIES) {
  const region = country.region || country.subregion || "Other";
  if (!REGION_COUNTRY_MAP[region]) {
    REGION_COUNTRY_MAP[region] = [];
  }
  REGION_COUNTRY_MAP[region].push(country);
}

function getCitiesCached(isoCode) {
  if (COUNTRY_CITY_CACHE[isoCode]) {
    return COUNTRY_CITY_CACHE[isoCode];
  }

  let cities = City.getCitiesOfCountry(isoCode);

  if (!cities.length) {
    const states = State.getStatesOfCountry(isoCode);
    if (states.length) {
      cities = City.getCitiesOfState(isoCode, states[0].isoCode);
    }
  }

  COUNTRY_CITY_CACHE[isoCode] = cities;
  return cities;
}

function getStateNameByIsoCached(countryIsoCode) {
  if (COUNTRY_STATE_NAME_CACHE[countryIsoCode]) {
    return COUNTRY_STATE_NAME_CACHE[countryIsoCode];
  }

  const stateMap = {};
  const states = State.getStatesOfCountry(countryIsoCode) || [];
  states.forEach((state) => {
    if (state?.isoCode && state?.name) {
      stateMap[state.isoCode] = state.name;
    }
  });

  COUNTRY_STATE_NAME_CACHE[countryIsoCode] = stateMap;
  return stateMap;
}

function generateGeographyFast() {
  const region = weightedPick(REGION_WEIGHTS);
  const countries = REGION_COUNTRY_MAP[region] || ALL_COUNTRIES;
  const country = pick(countries);

  const cities = getCitiesCached(country.isoCode);
  const pickedCity = cities.length ? pick(cities) : null;
  const city = pickedCity?.name || country.name;
  const stateByIso = getStateNameByIsoCached(country.isoCode);
  const state =
    stateByIso[pickedCity?.stateCode] ||
    pickedCity?.stateName ||
    country.name;

  return {
    region,
    country: country.name,
    state,
    city
  };
}

// =====================================================
// 💰 Pricing
// =====================================================

function getCategoryPricing(category) {
  switch (category) {
    case "Electronics": return { min: 8000, max: 80000, qtyMin: 1, qtyMax: 2 };
    case "Fashion": return { min: 800, max: 6000, qtyMin: 1, qtyMax: 3 };
    case "Home & Kitchen": return { min: 1500, max: 15000, qtyMin: 1, qtyMax: 2 };
    case "Grocery": return { min: 100, max: 1500, qtyMin: 2, qtyMax: 6 };
    case "Beauty": return { min: 300, max: 4000, qtyMin: 1, qtyMax: 3 };
    case "Sports": return { min: 1000, max: 12000, qtyMin: 1, qtyMax: 2 };
    case "Books": return { min: 300, max: 1200, qtyMin: 1, qtyMax: 2 };
  }
}

// =====================================================
// 🕒 TRAFFIC MODEL (MATCH HISTORICAL)
// =====================================================

function getHourlyWeight(hour) {
  if (hour >= 2 && hour <= 5) return 0.3;
  if (hour >= 6 && hour <= 9) return 0.7;
  if (hour >= 10 && hour <= 16) return 1.0;
  if (hour >= 17 && hour <= 22) return 1.8;
  return 0.8;
}

function applyWeekendBoost(date, traffic) {
  const day = date.getUTCDay();
  return (day === 0 || day === 6) ? traffic * 1.25 : traffic;
}

function isCampaignDay(date) {
  const days = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  return days % 45 < 4;
}

function getDeviceByHour(hour) {
  if (hour >= 18 && hour <= 23)
    return weightedPick({ mobile: 65, desktop: 25, tablet: 10 });
  if (hour >= 9 && hour <= 17)
    return weightedPick({ mobile: 45, desktop: 45, tablet: 10 });
  return weightedPick({ mobile: 55, desktop: 35, tablet: 10 });
}

function generateProduct() {
  const category = weightedPick(CATEGORY_WEIGHTS);
  const subcategories = PRODUCT_CATALOG[category].subcategories;
  const subcategory = pick(Object.keys(subcategories));
  const brand = pick(subcategories[subcategory]);

  return {
    productId: `P-${randomInt(100000, 999999)}`,
    productName: `${brand} ${subcategory}`,
    category,
    subcategory,
    brand
  };
}

// =====================================================
// 🔒 Duplicate Check
// =====================================================

async function hourExists(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();

  const count = await RawSale.countDocuments({ year, month, day, hour });
  return count > 0;
}

// =====================================================
// 🛠 Backfill (Chunked & Optimized)
// =====================================================

// async function runFullIntegrityCheck() {

//   console.log("🔎 Running full integrity check...");

//   const firstRecord = await RawSale.findOne().sort({ timestamp: 1 });
//   if (!firstRecord) {
//     console.log("No data found.");
//     return;
//   }

//   const start = new Date(firstRecord.timestamp);
//   start.setUTCMinutes(0, 0, 0);

//   const now = new Date();
//   now.setUTCMinutes(0, 0, 0);

//   // Get all existing hour keys in one query
//   const existingHours = await RawSale.aggregate([
//     {
//       $group: {
//         _id: {
//           year: "$year",
//           month: "$month",
//           day: "$day",
//           hour: "$hour"
//         },
//         count: { $sum: 1 }
//       }
//     }
//   ]);

//   const hourMap = new Map();

//   for (const h of existingHours) {
//     const key = `${h._id.year}-${h._id.month}-${h._id.day}-${h._id.hour}`;
//     hourMap.set(key, h.count);
//   }

//   let cursor = new Date(start);
//   const buffer = [];
//   const CHUNK_SIZE = 2000;

//   while (cursor <= now) {

//     const year = cursor.getUTCFullYear();
//     const month = cursor.getUTCMonth() + 1;
//     const day = cursor.getUTCDate();
//     const hour = cursor.getUTCHours();

//     const key = `${year}-${month}-${day}-${hour}`;

//     let traffic = 15 * getHourlyWeight(hour);
//     traffic = applyWeekendBoost(cursor, traffic);
//     if (isCampaignDay(cursor)) traffic *= 2;

//     const target = Math.floor(traffic + randomInt(0, 5));
//     const existing = hourMap.get(key) || 0;

//     const toGenerate = target - existing;

//     if (toGenerate > 0) {

//       console.log(`🛠 Filling ${toGenerate} for ${key}`);

//       for (let i = 0; i < toGenerate; i++) {

//         const product = generateProduct();
//         const geo = generateGeographyFast();
//         const pricing = getCategoryPricing(product.category);

//         let price = randomInt(pricing.min, pricing.max);
//         const quantity = randomInt(pricing.qtyMin, pricing.qtyMax);

//         const customer = getCustomerProfile();
//         if (customer.customerType === "returning") price *= 1.12;
//         if (isCampaignDay(cursor)) price *= 1.1;

//         const cost = Math.floor(price * 0.6);
//         const discountAmount = randomInt(0, 300);
//         const shippingCost = randomInt(0, 200);
//         const revenue = quantity * price - discountAmount;
//         const profit = revenue - quantity * cost - shippingCost;

//         buffer.push({
//           transactionId: `TX-${Date.now()}-${Math.random()}`,
//           timestamp: new Date(cursor),
//           product,
//           customer,
//           geography: geo,
//           marketing: {
//             trafficSource: pick(["google", "facebook", "direct"]),
//             campaignId: `CMP-${randomInt(1, 10)}`,
//             deviceType: getDeviceByHour(hour)
//           },
//           quantity,
//           price,
//           cost,
//           discountAmount,
//           taxAmount: randomInt(0, 200),
//           shippingCost,
//           revenue,
//           profit,
//           orderStatus: weightedPick(ORDER_STATUS_WEIGHTS),
//           isTestData: true,
//           year,
//           month,
//           day,
//           hour,
//           quarter: Math.floor((month - 1) / 3) + 1
//         });

//         if (buffer.length >= CHUNK_SIZE) {
//           await RawSale.insertMany(buffer, { ordered: false });
//           buffer.length = 0;
//         }
//       }
//     }

//     cursor.setUTCHours(cursor.getUTCHours() + 1);
//   }

//   if (buffer.length) {
//     await RawSale.insertMany(buffer, { ordered: false });
//   }

//   console.log("✅ Full integrity backfill complete.");
// }

// // =====================================================
// // ⚡ Realtime
// // =====================================================

async function runRealtime() {

  const now = new Date();
  now.setUTCMinutes(0, 0, 0);

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const hour = now.getUTCHours();

  let traffic = 15 * getHourlyWeight(hour);
  traffic = applyWeekendBoost(now, traffic);
  if (isCampaignDay(now)) traffic *= 2;

  const target = Math.floor(traffic + randomInt(0, 5));
  const existing = await RawSale.countDocuments({ year, month, day, hour });

  if (existing >= target) {
    console.log("⚡ Realtime: target reached");
    return;
  }

  const batchSize = Math.min(randomInt(1, 3), target - existing);
  const bulk = [];

  for (let i = 0; i < batchSize; i++) {

    const product = generateProduct();
    const geo = generateGeographyFast();
    const pricing = getCategoryPricing(product.category);

    let price = randomInt(pricing.min, pricing.max);
    const quantity = randomInt(pricing.qtyMin, pricing.qtyMax);

    const customer = getCustomerProfile();
    const isReturning = customer.customerType === "returning";
    if (isReturning) price *= 1.12;
    if (isCampaignDay(now)) price *= 1.1;

    const cost = Math.floor(price * 0.6);
    const discountAmount = randomInt(0, 300);
    const shippingCost = randomInt(0, 200);
    const revenue = quantity * price - discountAmount;
    const profit = revenue - quantity * cost - shippingCost;

    bulk.push({
      transactionId: `TX-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      product,
      customer,
      geography: geo,
      marketing: {
        trafficSource: pick(["google", "facebook", "direct"]),
        campaignId: `CMP-${randomInt(1, 10)}`,
        deviceType: getDeviceByHour(hour)
      },
      quantity,
      price,
      cost,
      discountAmount,
      taxAmount: randomInt(0, 200),
      shippingCost,
      revenue,
      profit,
      orderStatus: weightedPick(ORDER_STATUS_WEIGHTS),
      isTestData: true,
      year,
      month,
      day,
      hour,
      quarter: Math.floor((month - 1) / 3) + 1
    });
  }

  if (bulk.length) {
    await RawSale.insertMany(bulk, { ordered: false });
    console.log(`⚡ Realtime inserted ${bulk.length}`);
  }
}

// =====================================================
// 🚀 RecentIntegrityRepair(Last 3 Days)
// =====================================================

async function runRecentIntegrityRepair() {

  console.log("🔎 Repairing last 3 days (empty + partial hours)...");

  const now = new Date();
  now.setUTCMinutes(0, 0, 0);

  const HOURS_TO_CHECK = 24 * 3; // 72 hours
  const CHUNK_SIZE = 2000;
  const buffer = [];

  // 🔹 Get existing counts for last 3 days in ONE query (fast)
  const since = new Date(now);
  since.setUTCHours(since.getUTCHours() - HOURS_TO_CHECK);

  const existingData = await RawSale.aggregate([
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
          day: "$day",
          hour: "$hour"
        },
        count: { $sum: 1 }
      }
    }
  ]);

  const hourMap = new Map();

  for (const h of existingData) {
    const key = `${h._id.year}-${h._id.month}-${h._id.day}-${h._id.hour}`;
    hourMap.set(key, h.count);
  }

  // 🔹 Loop through last 72 hours
  for (let i = 1; i <= HOURS_TO_CHECK; i++) {

    const cursor = new Date(now);
    cursor.setUTCHours(cursor.getUTCHours() - i);

    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const day = cursor.getUTCDate();
    const hour = cursor.getUTCHours();

    const key = `${year}-${month}-${day}-${hour}`;
    const existing = hourMap.get(key) || 0;

    // 🔹 Calculate target using your traffic model
    let traffic = 15 * getHourlyWeight(hour);
    traffic = applyWeekendBoost(cursor, traffic);
    if (isCampaignDay(cursor)) traffic *= 2;

    const target = Math.floor(traffic + randomInt(0, 5));

    if (existing >= target) continue; // healthy hour

    const toGenerate = target - existing;

    console.log(`🛠 Repairing ${toGenerate} docs for ${key}`);

    for (let j = 0; j < toGenerate; j++) {

      const product = generateProduct();
      const geo = generateGeographyFast();
      const pricing = getCategoryPricing(product.category);

      let price = randomInt(pricing.min, pricing.max);
      const quantity = randomInt(pricing.qtyMin, pricing.qtyMax);

      const customer = getCustomerProfile();
      if (customer.customerType === "returning") price *= 1.12;
      if (isCampaignDay(cursor)) price *= 1.1;

      const cost = Math.floor(price * 0.6);
      const discountAmount = randomInt(0, 300);
      const shippingCost = randomInt(0, 200);
      const revenue = quantity * price - discountAmount;
      const profit = revenue - quantity * cost - shippingCost;

      buffer.push({
        transactionId: `TX-${Date.now()}-${Math.random()}`,
        timestamp: new Date(cursor),
        product,
        customer,
        geography: geo,
        marketing: {
          trafficSource: pick(["google", "facebook", "direct"]),
          campaignId: `CMP-${randomInt(1, 10)}`,
          deviceType: getDeviceByHour(hour)
        },
        quantity,
        price,
        cost,
        discountAmount,
        taxAmount: randomInt(0, 200),
        shippingCost,
        revenue,
        profit,
        orderStatus: weightedPick(ORDER_STATUS_WEIGHTS),
        isTestData: true,
        year,
        month,
        day,
        hour,
        quarter: Math.floor((month - 1) / 3) + 1
      });

      if (buffer.length >= CHUNK_SIZE) {
        await RawSale.insertMany(buffer, { ordered: false });
        buffer.length = 0;
      }
    }
  }

  if (buffer.length) {
    await RawSale.insertMany(buffer, { ordered: false });
  }

  console.log("✅ Last 3 days integrity repair complete.");
}
async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Hybrid ingestion connected");

  await runRecentIntegrityRepair(); // repair last 3 days

  cron.schedule("*/5 * * * *", runRealtime);

  console.log("🚀 Hybrid system running...");
}
start();
