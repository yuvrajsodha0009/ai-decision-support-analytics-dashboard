const cache = new Map();

const ONE_HOUR_MS = 60 * 60 * 1000;

function getCacheKey(data) {
  try {
    return JSON.stringify(data);
  } catch (error) {
    return null;
  }
}

function getCached(key) {
  if (!key) return null;

  const entry = cache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > ONE_HOUR_MS;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function setCache(key, value) {
  if (!key) return;

  cache.set(key, {
    value,
    timestamp: Date.now(),
  });
}

module.exports = {
  getCacheKey,
  getCached,
  setCache,
};
