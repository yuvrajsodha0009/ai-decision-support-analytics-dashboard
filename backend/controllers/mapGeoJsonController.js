const {
  parseMapGeoJsonQuery,
  fetchMapGeoJson,
} = require("../Services/mapGeoJsonService");

function validationError(res, message) {
  return res.status(400).json({ message });
}

function upstreamError(res, message, error) {
  const status = Number(error?.response?.status);
  if (status === 404) {
    return res.status(404).json({ message });
  }

  console.error(message, error?.message || error);
  return res.status(502).json({ message: "Failed to load map geometry" });
}

exports.getMapGeoJson = async (req, res) => {
  const parsed = parseMapGeoJsonQuery(req.query);
  if (parsed.error) return validationError(res, parsed.error);

  try {
    const payload = await fetchMapGeoJson(parsed.value);
    return res.json(payload);
  } catch (error) {
    const countryCode = parsed.value?.countryCode || "";
    const notFoundMessage = countryCode
      ? `No map geometry found for country code "${countryCode}"`
      : "World map geometry not found";

    return upstreamError(res, notFoundMessage, error);
  }
};
