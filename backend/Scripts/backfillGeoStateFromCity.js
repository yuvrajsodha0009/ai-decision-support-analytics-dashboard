require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const { Country, State, City } = require("country-state-city");
const RawSale = require("../models/RawSale");

const BATCH_SIZE = 1000;

const COUNTRY_NAME_ALIASES = {
  "united states of america": "united states",
  "russian federation": "russia",
  "republic of korea": "south korea",
  "korea, republic of": "south korea",
  "democratic people's republic of korea": "north korea",
  czechia: "czech republic",
  "viet nam": "vietnam",
  "lao pdr": "laos",
  "syrian arab republic": "syria",
  "iran (islamic republic of)": "iran",
  "moldova (republic of)": "moldova",
  "tã¼rkiye": "turkey",
  "tãƒâ¼rkiye": "turkey",
};

const normalizeGeoName = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const COUNTRY_ISO_BY_NAME = (() => {
  const map = new Map();

  Country.getAllCountries().forEach((country) => {
    const normalized = normalizeGeoName(country?.name);
    if (normalized) {
      map.set(normalized, country.isoCode);
    }
  });

  Object.entries(COUNTRY_NAME_ALIASES).forEach(([source, target]) => {
    const sourceKey = normalizeGeoName(source);
    const targetKey = normalizeGeoName(target);
    const isoCode = map.get(targetKey);
    if (sourceKey && isoCode) {
      map.set(sourceKey, isoCode);
    }
  });

  return map;
})();

const COUNTRY_STATE_CITY_CACHE = new Map();

function resolveCountryIso(countryName) {
  const normalized = normalizeGeoName(countryName);
  if (!normalized) return "";
  return COUNTRY_ISO_BY_NAME.get(normalized) || "";
}

function getCountryStateCityIndex(countryIso) {
  if (!countryIso) return null;
  if (COUNTRY_STATE_CITY_CACHE.has(countryIso)) {
    return COUNTRY_STATE_CITY_CACHE.get(countryIso);
  }

  const states = State.getStatesOfCountry(countryIso) || [];
  const cities = City.getCitiesOfCountry(countryIso) || [];
  const stateNameByIso = new Map();
  const stateNameByNormalized = new Map();
  const cityToStateName = new Map();

  states.forEach((state) => {
    const stateName = String(state?.name || "").trim();
    const stateKey = normalizeGeoName(stateName);
    if (!stateName || !stateKey) return;
    stateNameByNormalized.set(stateKey, stateName);
    if (state?.isoCode) {
      stateNameByIso.set(state.isoCode, stateName);
    }
  });

  cities.forEach((city) => {
    const cityName = String(city?.name || "").trim();
    const cityKey = normalizeGeoName(cityName);
    if (!cityName || !cityKey) return;

    const stateName =
      stateNameByIso.get(city?.stateCode) ||
      String(city?.stateName || "").trim();
    const stateKey = normalizeGeoName(stateName);
    const canonicalStateName = stateNameByNormalized.get(stateKey) || stateName;
    if (!canonicalStateName) return;

    if (!cityToStateName.has(cityKey)) {
      cityToStateName.set(cityKey, canonicalStateName);
    }
  });

  const index = {
    stateNameByNormalized,
    cityToStateName,
  };

  COUNTRY_STATE_CITY_CACHE.set(countryIso, index);
  return index;
}

function resolveStateName(countryName, cityName, currentState) {
  const countryIso = resolveCountryIso(countryName);
  const index = getCountryStateCityIndex(countryIso);
  if (!index) return "";

  const normalizedState = normalizeGeoName(currentState);
  if (normalizedState) {
    const mappedState = index.stateNameByNormalized.get(normalizedState);
    if (mappedState) return mappedState;
  }

  const normalizedCity = normalizeGeoName(cityName);
  if (!normalizedCity) return "";
  return index.cityToStateName.get(normalizedCity) || "";
}

async function flushBulk(operations) {
  if (!operations.length) return 0;
  const result = await RawSale.bulkWrite(operations, { ordered: false });
  return Number(result?.modifiedCount || 0);
}

async function runBackfill() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const query = {
    "geography.country": { $nin: [null, ""] },
    "geography.city": { $nin: [null, ""] },
    $or: [
      { "geography.state": { $exists: false } },
      { "geography.state": null },
      { "geography.state": "" },
      { "geography.state": "unknown" },
    ],
  };

  const cursor = RawSale.find(query)
    .select({
      _id: 1,
      geography: 1,
    })
    .lean()
    .cursor();

  let scanned = 0;
  let mapped = 0;
  let updated = 0;
  let unresolved = 0;
  const unresolvedSamples = new Set();
  const operations = [];

  for await (const doc of cursor) {
    scanned += 1;
    const country = String(doc?.geography?.country || "").trim();
    const city = String(doc?.geography?.city || "").trim();
    const currentState = String(doc?.geography?.state || "").trim();

    const nextState = resolveStateName(country, city, currentState);
    if (!nextState) {
      unresolved += 1;
      if (unresolvedSamples.size < 20) {
        unresolvedSamples.add(`${country} | ${city}`);
      }
      continue;
    }

    mapped += 1;
    operations.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            "geography.state": nextState,
          },
        },
      },
    });

    if (operations.length >= BATCH_SIZE) {
      updated += await flushBulk(operations);
      operations.length = 0;
      console.log(`Progress: scanned=${scanned}, updated=${updated}`);
    }
  }

  updated += await flushBulk(operations);

  console.log("Backfill complete");
  console.log(`Scanned: ${scanned}`);
  console.log(`Mapped: ${mapped}`);
  console.log(`Updated: ${updated}`);
  console.log(`Unresolved: ${unresolved}`);

  if (unresolvedSamples.size > 0) {
    console.log("Unresolved samples:");
    [...unresolvedSamples].forEach((sample) => console.log(`- ${sample}`));
  }

  await mongoose.disconnect();
}

runBackfill().catch(async (error) => {
  console.error("Backfill failed:", error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // no-op
  }
  process.exit(1);
});
