const axios = require("axios");
const path = require("path");
const fs = require("fs/promises");

const MAP_BASE_URL = "https://code.highcharts.com/mapdata";
const ALLOWED_LEVELS = new Set(["world", "country"]);
const COUNTRY_CODE_REGEX = /^[a-z]{2}$/;
const MAP_COLLECTION_ROOT = path.resolve(
  __dirname,
  "../node_modules/@highcharts/map-collection"
);
const MAX_RETRY_COUNT = 2;

const mapCache = new Map();

function parseMapGeoJsonQuery(query) {
  const level = typeof query.level === "string" ? query.level.trim().toLowerCase() : "";
  if (!ALLOWED_LEVELS.has(level)) {
    return { error: "level must be one of world or country" };
  }

  if (level === "world") {
    return {
      value: {
        level,
        cacheKey: "world",
        localPath: path.join(MAP_COLLECTION_ROOT, "custom", "world.geo.json"),
        url: `${MAP_BASE_URL}/custom/world.geo.json`,
      },
    };
  }

  const countryCodeRaw =
    typeof query.countryCode === "string" ? query.countryCode.trim().toLowerCase() : "";

  if (!COUNTRY_CODE_REGEX.test(countryCodeRaw)) {
    return { error: "countryCode must be a 2-letter ISO code (e.g., in, us, fr)" };
  }

  return {
    value: {
      level,
      countryCode: countryCodeRaw,
      cacheKey: `country:${countryCodeRaw}`,
      localPath: path.join(
        MAP_COLLECTION_ROOT,
        "countries",
        countryCodeRaw,
        `${countryCodeRaw}-all.geo.json`
      ),
      url: `${MAP_BASE_URL}/countries/${countryCodeRaw}/${countryCodeRaw}-all.geo.json`,
    },
  };
}

async function loadLocalMapGeoJson(localPath) {
  const raw = await fs.readFile(localPath, "utf8");
  const payload = JSON.parse(raw);

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid local geoJSON payload");
  }

  return payload;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRemoteMapGeoJson(url) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRY_COUNT; attempt += 1) {
    try {
      const response = await axios.get(url, {
        timeout: 12000,
        responseType: "json",
      });

      const payload = response.data;
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid remote geoJSON payload");
      }

      return payload;
    } catch (error) {
      lastError = error;
      const status = Number(error?.response?.status);
      const shouldRetry = status === 429 || status >= 500;

      if (!shouldRetry || attempt === MAX_RETRY_COUNT) break;
      await wait(400 * (attempt + 1));
    }
  }

  throw lastError;
}

async function fetchMapGeoJson(parsedQuery) {
  if (mapCache.has(parsedQuery.cacheKey)) {
    return mapCache.get(parsedQuery.cacheKey);
  }

  try {
    const localPayload = await loadLocalMapGeoJson(parsedQuery.localPath);
    mapCache.set(parsedQuery.cacheKey, localPayload);
    return localPayload;
  } catch (localError) {
    const isNotFound =
      localError?.code === "ENOENT" || localError?.name === "SyntaxError";
    if (!isNotFound) {
      throw localError;
    }
  }

  const remotePayload = await fetchRemoteMapGeoJson(parsedQuery.url);
  mapCache.set(parsedQuery.cacheKey, remotePayload);
  return remotePayload;
}

module.exports = {
  parseMapGeoJsonQuery,
  fetchMapGeoJson,
};
