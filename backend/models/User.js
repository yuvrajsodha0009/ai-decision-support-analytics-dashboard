const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long']
    },
    // Canonical RBAC hierarchy.
    role: {
      type: String,
      enum: ['Employee', 'Manager', 'Admin'],
      default: 'Employee',
      required: true
    },
    accountStatus: {
      type: String,
      enum: ["Active", "Suspended"],
      default: "Active",
      required: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    // Optional company scoping (nullable). No Company model scaffolded here—nullable keeps compatibility.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
      default: null
    },
    avatar: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
