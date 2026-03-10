require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env")
});

const mongoose = require("mongoose");
const RawSale = require("../models/RawSale");
const { Country, State, City } = require("country-state-city");

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

// Reuse existing IDs so seeded data contains realistic returning orders.
function getCustomerProfile() {
  const shouldReuse =
    CUSTOMER_POOL.length > 0 && Math.random() < RETURNING_REUSE_RATE;

  if (shouldReuse) {
    return {
      customerId: pick(CUSTOMER_POOL),
      customerType: "returning"
    };
  }

  return {
    customerId: createUniqueCustomerId(),
    customerType: "new"
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
// 🛍 Product Catalog (Same as before)
// =====================================================

const PRODUCT_CATALOG = {
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
// 📊 Realistic Bias Config
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
// ⚡ GEO CACHING (FAST VERSION)
// =====================================================

const ALL_COUNTRIES = Country.getAllCountries();
const REGION_COUNTRY_MAP = {};
const COUNTRY_CITY_CACHE = {};

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

function generateGeographyFast() {
  const region = weightedPick(REGION_WEIGHTS);
  const countries = REGION_COUNTRY_MAP[region] || ALL_COUNTRIES;
  const country = pick(countries);

  const cities = getCitiesCached(country.isoCode);
  const city = cities.length ? pick(cities).name : country.name;

  return {
    region,
    country: country.name,
    city
  };
}

// =====================================================
// 💰 Pricing Logic
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
// 🕒 Traffic Model
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

// =====================================================
// 🛍 Product Generator
// =====================================================

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
// 🚀 Seed Function (Chunked Insert)
// =====================================================

async function seedDB() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    console.log("🗑 Removing old test data...");
    await RawSale.deleteMany({ isTestData: true });

    const DAYS = 365 * 2;   // 730 days
    const CHUNK_SIZE = 10000;
    let buffer = [];
    let totalInserted = 0;

    console.log("📊 Generating & inserting data...");

    for (let d = 0; d < DAYS; d++) {
      if (d % 10 === 0) {
        console.log(`Processing day ${d}/${DAYS}`);
      }

      for (let h = 0; h < 24; h++) {

        const baseTime = new Date();
        baseTime.setUTCDate(baseTime.getUTCDate() - d);
        baseTime.setUTCHours(h, 0, 0, 0);

        let traffic = 15 * getHourlyWeight(h);
        traffic = applyWeekendBoost(baseTime, traffic);
        if (isCampaignDay(baseTime)) traffic *= 2;

        const salesPerHour = Math.floor(traffic + randomInt(0, 5));

        for (let i = 0; i < salesPerHour; i++) {

          const product = generateProduct();
          const geo = generateGeographyFast();
          const pricing = getCategoryPricing(product.category);
          const customer = getCustomerProfile();

          let price = randomInt(pricing.min, pricing.max);
          const quantity = randomInt(pricing.qtyMin, pricing.qtyMax);

          const isReturning = customer.customerType === "returning";
          if (isReturning) price *= 1.12;
          if (isCampaignDay(baseTime)) price *= 1.1;

          const cost = Math.floor(price * 0.6);
          const discountAmount = isCampaignDay(baseTime)
            ? randomInt(100, 2000)
            : randomInt(0, 300);

          const shippingCost = randomInt(0, 200);
          const revenue = quantity * price - discountAmount;
          const profit = revenue - quantity * cost - shippingCost;

          buffer.push({
            transactionId: `TX-${Date.now()}-${Math.random()}`,
            timestamp: new Date(baseTime),
            product,
            customer,
            geography: geo,
            marketing: {
              trafficSource: pick(["google", "facebook", "direct"]),
              campaignId: `CMP-${randomInt(1, 10)}`,
              deviceType: getDeviceByHour(h)
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
            year: baseTime.getUTCFullYear(),
            month: baseTime.getUTCMonth() + 1,
            day: baseTime.getUTCDate(),
            hour: baseTime.getUTCHours(),
            quarter: Math.floor((baseTime.getUTCMonth()) / 3) + 1
          });

          if (buffer.length >= CHUNK_SIZE) {
            const inserted = await RawSale.insertMany(buffer, { ordered: false });
            totalInserted += inserted.length;
            console.log(`Inserted chunk. Total so far: ${totalInserted}`);
            buffer = [];
          }
        }
      }
    }

    if (buffer.length) {
      const inserted = await RawSale.insertMany(buffer, { ordered: false });
      totalInserted += inserted.length;
    }

    console.log(`🎉 Seeding complete. Total inserted: ${totalInserted}`);
    process.exit(0);

  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seedDB();
