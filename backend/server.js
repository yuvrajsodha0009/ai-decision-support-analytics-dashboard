const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= ROUTES =================

// Auth
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/activity", require("./routes/activityRoutes"));

// Core data
app.use("/api/data", require("./routes/dataRoutes"));
app.use("/api", require("./routes/salesRoutes"));

// Analytics
app.use("/api/analytics", require("./routes/analyticsRoutes"));      // CSV / Sales
app.use("/api", require("./routes/csvAnalyticsRoutes"));             // CSV helpers
app.use("/api", require("./routes/apiDataRoutes"));                  // API DSS

// Utilities
app.use("/api/kpis", require("./routes/kpiRoutes"));
app.use("/api/data-cleaning", require("./routes/dataCleaningRoutes"));
app.use("/api/data-cleaning", require("./routes/dataPreprocessingRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));

// ================= START SERVER =================

connectDB()
  .then(async () => {
    const adminEmail = "admin@gmail.com";
    const adminPassword = "admin123";

    let adminUser = await User.findOne({ email: adminEmail });
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    if (!adminUser) {
      await User.create({
        name: "Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      });
      console.log("✅ Default admin created");
    } else if (!(await bcrypt.compare(adminPassword, adminUser.password))) {
      adminUser.password = hashedPassword;
      await adminUser.save();
      console.log("✅ Default admin password reset");
    }

    if (adminUser && adminUser.role !== "admin") {
      adminUser.role = "admin";
      await adminUser.save();
      console.log("âœ… Default admin role upgraded");
    }

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log(`🚀 Backend running on port ${PORT}`)
    );
  })
  .catch(err => console.error("❌ DB connection failed", err));
