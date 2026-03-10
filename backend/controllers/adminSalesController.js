const {
  parseAdminSalesQuery,
  getPaginatedRawSales,
  exportRawSalesCsv,
} = require("../Services/adminSalesService");

function validationError(res, message) {
  return res.status(400).json({ message });
}

function serverError(res, message, error) {
  console.error(message, error);
  return res.status(500).json({ message });
}

exports.getAdminSales = async (req, res) => {
  try {
    const parsed = parseAdminSalesQuery(req.query);
    if (parsed.error) return validationError(res, parsed.error);

    const data = await getPaginatedRawSales(parsed.value);
    return res.json(data);
  } catch (error) {
    return serverError(res, "Failed to fetch admin sales data", error);
  }
};

exports.exportAdminSales = async (req, res) => {
  try {
    const parsed = parseAdminSalesQuery(req.query);
    if (parsed.error) return validationError(res, parsed.error);

    const csv = await exportRawSalesCsv(parsed.value);
    const fileName = `rawsales-export-${Date.now()}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(csv);
  } catch (error) {
    return serverError(res, "Failed to export admin sales data", error);
  }
};

