const PDFDocument = require("pdfkit");
const Sales = require("../models/Sales");
const ApiData = require("../models/ApiData");
const KPI = require("../models/KPI");
const Data = require("../models/Data");
const logActivity = require("../utils/logActivity");

// --- Helper Functions for Styling ---

// 1. Check if we need a new page
const checkPageSpace = (doc, requiredSpace) => {
  if (doc.y + requiredSpace > doc.page.height - 50) {
    doc.addPage();
    return true; // New page added
  }
  return false; // Stayed on same page
};

// 2. Draw a Table Row
const drawTableRow = (doc, y, columns, isHeader = false) => {
  const startX = 35;
  const height = isHeader ? 20 : 18;
  
  // Background for header or alternating rows could go here
  if (isHeader) {
    doc.rect(startX, y, doc.page.width - 70, height).fill("#F3F4F6");
  }

  columns.forEach((col, i) => {
    let xOffset = startX;
    for (let j = 0; j < i; j++) xOffset += columns[j].width;

    doc.fontSize(isHeader ? 9 : 8)
       .font(isHeader ? "Helvetica-Bold" : "Helvetica")
       .fillColor(isHeader ? "#1F2937" : "#4B5563")
       .text(col.text, xOffset + 5, y + 5, {
         width: col.width - 10,
         align: col.align || "left",
         lineBreak: false,
         ellipsis: true
       });
  });
  
  // Bottom line
  doc.moveTo(startX, y + height).lineTo(doc.page.width - 35, y + height).lineWidth(0.5).strokeColor("#E5E7EB").stroke();
  
  return height; // Return height used
};

// 3. Draw Section Title
const drawSectionHeader = (doc, title, color) => {
  checkPageSpace(doc, 40);
  doc.moveDown(1.5);
  doc.fontSize(12).font("Helvetica-Bold").fillColor(color).text(title);
  doc.moveTo(35, doc.y + 2).lineTo(doc.page.width - 35, doc.y + 2).stroke(color);
  doc.moveDown(0.5);
};


// --- Main Export Controller ---

exports.exportPDFWithModules = async (req, res) => {
  try {
    const { modules } = req.body || {}; // Handle if req.body is undefined

    // 1. Fetch Data
    let salesData = [], apiData = [], kpiData = [], csvData = [];

    // Parallel fetching for performance
    const promises = [];
    if (!modules || modules.sales) promises.push(Sales.find().sort({ date: -1 }).limit(50).then(d => salesData = d));
    if (!modules || modules.apiData) promises.push(ApiData.find().sort({ fetchedAt: -1 }).limit(50).then(d => apiData = d));
    if (!modules || modules.dataQuality) promises.push(KPI.find().sort({ createdAt: -1 }).limit(20).then(d => kpiData = d));
    if (!modules || modules.csvUpload) promises.push(Data.find().sort({ uploadedAt: -1 }).limit(50).then(d => csvData = d));
    
    await Promise.all(promises);

    const moduleList = modules
      ? Object.keys(modules).filter((m) => modules[m])
      : ["sales", "apiData", "dataQuality", "csvUpload"];

    await logActivity(
      req.userId ? "User" : "System",
      "Report Exported",
      "Reports",
      `Exported PDF report (${moduleList.join(", ") || "all modules"})`,
      "success",
      req
    );

    // 2. Init PDF
    const doc = new PDFDocument({ margin: 35, size: "A4", bufferPages: true });
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=report-${new Date().toISOString().split("T")[0]}.pdf`);
    doc.pipe(res);

    // 3. Header
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#111827").text("Analytics Report", { align: "left" });
    doc.fontSize(9).font("Helvetica").fillColor("#6B7280").text(`Generated on: ${new Date().toLocaleString()}`, { align: "left" });
    doc.moveDown(0.5);
    
    // Draw a divider
    doc.moveTo(35, doc.y).lineTo(doc.page.width - 35, doc.y).strokeColor("#E5E7EB").stroke();
    doc.moveDown(1);

    // 4. Executive Summary (Compact)
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#000").text("Executive Summary");
    doc.moveDown(0.5);
    
    const summaryY = doc.y;
    const boxWidth = 120;
    let currentX = 35;

    // Helper to draw a summary card
    const drawCard = (label, value, color) => {
        doc.rect(currentX, summaryY, boxWidth, 40).fillAndStroke("#F9FAFB", "#E5E7EB");
        doc.fillColor("#6B7280").fontSize(8).text(label, currentX + 10, summaryY + 8);
        doc.fillColor(color).fontSize(14).font("Helvetica-Bold").text(value, currentX + 10, summaryY + 22);
        currentX += boxWidth + 10;
    };

    if (salesData.length > 0) drawCard("Total Sales", salesData.length, "#EC4899");
    if (apiData.length > 0) drawCard("API Records", apiData.length, "#3B82F6");
    if (kpiData.length > 0) drawCard("KPI Metrics", kpiData.length, "#10B981");
    if (csvData.length > 0) drawCard("CSV Data", csvData.length, "#F59E0B");

    doc.y = summaryY + 50; // Move below cards

    // 5. Sales Section
    if (salesData.length > 0) {
      drawSectionHeader(doc, "Sales Performance", "#EC4899");
      
      const totalRev = salesData.reduce((sum, s) => sum + (s.revenue || 0), 0);
      doc.fontSize(9).fillColor("#374151").text(`Total Revenue: ₹${totalRev.toLocaleString("en-IN")}  |  Records: ${salesData.length}`);
      doc.moveDown(0.5);

      const columns = [
        { text: "#", width: 30, align: "center" },
        { text: "Product", width: 250, align: "left" },
        { text: "Qty", width: 80, align: "center" },
        { text: "Revenue", width: 100, align: "right" }
      ];

      // Draw Header
      checkPageSpace(doc, 40);
      drawTableRow(doc, doc.y, columns, true);
      doc.moveDown(0.2); // slight spacing

      // Draw Rows
      salesData.forEach((sale, i) => {
        checkPageSpace(doc, 18);
        const rowData = [
          { text: (i + 1).toString(), width: 30, align: "center" },
          { text: sale.product || "N/A", width: 250, align: "left" },
          { text: (sale.quantity || 0).toString(), width: 80, align: "center" },
          { text: "₹" + (sale.revenue || 0).toLocaleString("en-IN"), width: 100, align: "right" }
        ];
        doc.y += drawTableRow(doc, doc.y, rowData);
      });
    }

    // 6. API Data Section
    if (apiData.length > 0) {
      drawSectionHeader(doc, "API Data Logs", "#3B82F6");

      const columns = [
        { text: "#", width: 30, align: "center" },
        { text: "Title / Source", width: 250, align: "left" },
        { text: "Value", width: 80, align: "right" },
        { text: "Fetched", width: 120, align: "right" }
      ];

      checkPageSpace(doc, 40);
      drawTableRow(doc, doc.y, columns, true);
      doc.moveDown(0.2);

      apiData.forEach((item, i) => {
        checkPageSpace(doc, 18);
        const rowData = [
          { text: (i + 1).toString(), width: 30, align: "center" },
          { text: item.title || "N/A", width: 250, align: "left" },
          { text: (item.value || 0).toLocaleString(), width: 80, align: "right" },
          { text: item.fetchedAt ? new Date(item.fetchedAt).toLocaleDateString() : "-", width: 120, align: "right" }
        ];
        doc.y += drawTableRow(doc, doc.y, rowData);
      });
    }

    // 7. KPI Section
    if (kpiData.length > 0) {
      drawSectionHeader(doc, "Key Performance Indicators", "#10B981");

      const columns = [
        { text: "Metric Name", width: 180, align: "left" },
        { text: "Value", width: 80, align: "left" },
        { text: "Source", width: 100, align: "left" },
        { text: "Description", width: 150, align: "left" }
      ];

      checkPageSpace(doc, 40);
      drawTableRow(doc, doc.y, columns, true);
      doc.moveDown(0.2);

      kpiData.forEach((kpi) => {
        checkPageSpace(doc, 18);
        const rowData = [
          { text: kpi.name || "N/A", width: 180, align: "left" },
          { text: `${kpi.value || 0} ${kpi.unit || ""}`, width: 80, align: "left" },
          { text: kpi.source || "-", width: 100, align: "left" },
          { text: kpi.description || "-", width: 150, align: "left" }
        ];
        doc.y += drawTableRow(doc, doc.y, rowData);
      });
    }

    // 8. CSV Data Section
    if (csvData.length > 0) {
      drawSectionHeader(doc, "Recent Data Uploads", "#F59E0B");
      
      const columns = [
        { text: "#", width: 30, align: "center" },
        { text: "Data Preview", width: 480, align: "left" }
      ];

      checkPageSpace(doc, 40);
      drawTableRow(doc, doc.y, columns, true);
      doc.moveDown(0.2);

      csvData.slice(0, 25).forEach((item, i) => {
        checkPageSpace(doc, 18);
        // Create a string representation of the data
        const dataStr = Object.entries(item.toObject())
          .filter(([key]) => !key.startsWith("_"))
          .map(([key, val]) => `${key}:${val}`)
          .join(" | ")
          .substring(0, 100);

        const rowData = [
          { text: (i + 1).toString(), width: 30, align: "center" },
          { text: dataStr, width: 480, align: "left" }
        ];
        doc.y += drawTableRow(doc, doc.y, rowData);
      });
    }

    // 9. Page Numbering (Apply to all pages at the end)
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor("#9CA3AF")
         .text(`Page ${i + 1} of ${range.count}`, 35, doc.page.height - 25, { align: "center" });
    }

    doc.end();

  } catch (error) {
    console.error("Error generating PDF:", error);
    if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate PDF report" });
    }
  }
};

// Map exportPDF to the same function but with all modules enabled by default
exports.exportPDF = async (req, res) => {
    // Force all modules to true
    req.body = { 
        modules: { sales: true, apiData: true, dataQuality: true, csvUpload: true } 
    };
    return exports.exportPDFWithModules(req, res);
};

// Excel export with module selection
exports.exportExcelWithModules = async (req, res) => {
  try {
    const ExcelJS = require("exceljs");
    const { modules } = req.body || {};

    // Fetch data
    let salesData = [], apiData = [], kpiData = [], csvData = [];

    const promises = [];
    if (!modules || modules.sales) promises.push(Sales.find().sort({ date: -1 }).limit(100).then(d => salesData = d));
    if (!modules || modules.apiData) promises.push(ApiData.find().sort({ fetchedAt: -1 }).limit(100).then(d => apiData = d));
    if (!modules || modules.dataQuality) promises.push(KPI.find().sort({ createdAt: -1 }).limit(50).then(d => kpiData = d));
    if (!modules || modules.csvUpload) promises.push(Data.find().sort({ uploadedAt: -1 }).limit(100).then(d => csvData = d));

    await Promise.all(promises);

    const moduleList = modules
      ? Object.keys(modules).filter((m) => modules[m])
      : ["sales", "apiData", "dataQuality", "csvUpload"];

    await logActivity(
      req.userId ? "User" : "System",
      "Report Exported",
      "Reports",
      `Exported Excel report (${moduleList.join(", ") || "all modules"})`,
      "success",
      req
    );

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    
    // Sales Sheet
    if ((!modules || modules.sales) && salesData.length > 0) {
      const salesSheet = workbook.addWorksheet("Sales");
      salesSheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Product", key: "product", width: 25 },
        { header: "Quantity", key: "quantity", width: 12 },
        { header: "Revenue (₹)", key: "revenue", width: 15 }
      ];

      salesData.forEach((sale) => {
        salesSheet.addRow({
          date: sale.date ? new Date(sale.date).toLocaleDateString() : "N/A",
          product: sale.product || "N/A",
          quantity: sale.quantity || 0,
          revenue: sale.revenue || 0
        });
      });

      // Style header
      salesSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      salesSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEC4899" } };
    }

    // API Data Sheet
    if ((!modules || modules.apiData) && apiData.length > 0) {
      const apiSheet = workbook.addWorksheet("API Data");
      apiSheet.columns = [
        { header: "Title", key: "title", width: 30 },
        { header: "Value", key: "value", width: 15 },
        { header: "Fetched At", key: "fetchedAt", width: 20 }
      ];

      apiData.forEach((item) => {
        apiSheet.addRow({
          title: item.title || "N/A",
          value: item.value || 0,
          fetchedAt: item.fetchedAt ? new Date(item.fetchedAt).toLocaleDateString() : "N/A"
        });
      });

      apiSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      apiSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
    }

    // KPI Sheet
    if ((!modules || modules.dataQuality) && kpiData.length > 0) {
      const kpiSheet = workbook.addWorksheet("KPIs");
      kpiSheet.columns = [
        { header: "Name", key: "name", width: 25 },
        { header: "Value", key: "value", width: 15 },
        { header: "Unit", key: "unit", width: 15 },
        { header: "Source", key: "source", width: 20 },
        { header: "Description", key: "description", width: 40 }
      ];

      kpiData.forEach((kpi) => {
        kpiSheet.addRow({
          name: kpi.name || "N/A",
          value: kpi.value || 0,
          unit: kpi.unit || "",
          source: kpi.source || "N/A",
          description: kpi.description || ""
        });
      });

      kpiSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      kpiSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } };
    }

    // CSV Data Sheet
    if ((!modules || modules.csvUpload) && csvData.length > 0) {
      const csvSheet = workbook.addWorksheet("CSV Data");
      
      // Get all unique keys from CSV data
      const keys = new Set();
      csvData.forEach((item) => {
        Object.keys(item.toObject()).forEach((key) => {
          if (!key.startsWith("_")) keys.add(key);
        });
      });

      const keyArray = Array.from(keys);
      const columns = keyArray.map((key) => ({ header: key, key, width: 15 }));
      csvSheet.columns = columns;

      csvData.forEach((item) => {
        const row = {};
        keyArray.forEach((key) => {
          row[key] = item[key] || "";
        });
        csvSheet.addRow(row);
      });

      csvSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      csvSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF59E0B" } };
    }

    // Send file
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=report-${new Date().toISOString().split("T")[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Error generating Excel:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate Excel report" });
    }
  }
};

// Map exportExcel to exportExcelWithModules with all modules enabled
exports.exportExcel = async (req, res) => {
  req.body = { 
    modules: { sales: true, apiData: true, dataQuality: true, csvUpload: true } 
  };
  return exports.exportExcelWithModules(req, res);
};
