const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logActivity = require("../utils/logActivity");
const {
  ROLES,
  ACCOUNT_STATUS,
  normalizeRole,
  normalizeAccountStatus,
  isAdminRole,
} = require("../utils/roles");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toSafeUser = (userDoc) => {
  const user = userDoc?.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  user.role = normalizeRole(user.role);
  user.accountStatus = normalizeAccountStatus(user.accountStatus);
  user.lastLoginAt = user.lastLoginAt || null;
  return user;
};

const toAuthUser = (userDoc) => {
  const user = toSafeUser(userDoc);
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

const signToken = (userDoc) =>
  jwt.sign(
    {
      id: userDoc._id,
      role: normalizeRole(userDoc.role),
      companyId: userDoc.companyId || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

const getRequesterFromToken = (req) => {
  const header = req?.headers?.authorization || req?.headers?.Authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      id: decoded?.id || null,
      role: normalizeRole(decoded?.role),
      companyId: decoded?.companyId || null,
    };
  } catch (error) {
    return null;
  }
};

const resolveRequester = (req) => {
  if (req?.user) {
    return {
      id: req.user.id || req.userId || null,
      role: normalizeRole(req.user.role),
      companyId: req.user.companyId || null,
    };
  }
  return getRequesterFromToken(req);
};

const countAdmins = async ({ onlyActive = false } = {}) => {
  const users = await User.find().select("role accountStatus");
  return users.filter((user) => {
    const isAdmin = normalizeRole(user.role) === ROLES.ADMIN;
    if (!isAdmin) return false;
    if (!onlyActive) return true;
    return normalizeAccountStatus(user.accountStatus) === ACCOUNT_STATUS.ACTIVE;
  }).length;
};

const isAdminPanelRequest = (requestedRole) =>
  String(requestedRole || "").trim().toLowerCase() === "admin";

const isUserPanelRequest = (requestedRole) => {
  const normalized = String(requestedRole || "").trim().toLowerCase();
  return normalized === "user" || normalized === "employee";
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const trimmedName = name?.trim();
    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedPassword = password?.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (trimmedPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const requester = resolveRequester(req);
    const requesterIsAdmin = requester ? isAdminRole(requester.role) : false;
    const requestedRole = normalizeRole(role);

    if (requester && !requesterIsAdmin) {
      return res
        .status(403)
        .json({ message: "Only Admin can create users from authenticated routes" });
    }

    if (!requesterIsAdmin && role && requestedRole !== ROLES.EMPLOYEE) {
      return res
        .status(403)
        .json({ message: "Only Admin can assign elevated roles" });
    }

    const finalRole = requesterIsAdmin ? requestedRole : ROLES.EMPLOYEE;
    const hash = await bcrypt.hash(trimmedPassword, 10);

    const user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      password: hash,
      role: finalRole,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    });

    await logActivity(
      "System",
      "User Registered",
      "User",
      `New user ${trimmedName} (${trimmedEmail}) registered`,
      "success",
      req,
    );

    const token = signToken(user);
    return res.status(201).json({ token, user: toAuthUser(user) });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role: requestedRole } = req.body;
    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedPassword = password?.trim();

    if (!trimmedEmail || !trimmedPassword) {
      await logActivity(
        trimmedEmail || "Unknown",
        "Login Failed",
        "Auth",
        "Missing email or password",
        "warning",
        req,
      );
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!emailRegex.test(trimmedEmail)) {
      await logActivity(
        trimmedEmail,
        "Login Failed",
        "Auth",
        "Invalid email format",
        "warning",
        req,
      );
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Fallback bootstrap for default admin credentials (keeps legacy behavior stable).
    const defaultAdmin = {
      name: "Admin",
      email: "admin@gmail.com",
      password: "admin123",
    };

    if (
      trimmedEmail === defaultAdmin.email &&
      trimmedPassword === defaultAdmin.password
    ) {
      if (isUserPanelRequest(requestedRole)) {
        await logActivity(
          trimmedEmail,
          "User Login Denied",
          "Auth",
          "Admins must login from the admin panel",
          "warning",
          req,
        );
        return res
          .status(403)
          .json({ message: "Admins must login from the admin panel" });
      }

      let adminUser = await User.findOne({ email: trimmedEmail });
      if (!adminUser) {
        const hash = await bcrypt.hash(defaultAdmin.password, 10);
        adminUser = await User.create({
          name: defaultAdmin.name,
          email: trimmedEmail,
          password: hash,
          role: ROLES.ADMIN,
          accountStatus: ACCOUNT_STATUS.ACTIVE,
        });
      } else {
        const matches = await bcrypt.compare(trimmedPassword, adminUser.password);
        if (!matches) {
          adminUser.password = await bcrypt.hash(defaultAdmin.password, 10);
        }
        adminUser.role = ROLES.ADMIN;
      }

      if (
        normalizeAccountStatus(adminUser.accountStatus) ===
        ACCOUNT_STATUS.SUSPENDED
      ) {
        await logActivity(
          adminUser.name || "Admin",
          "Admin Login Denied",
          "Auth",
          "Suspended account attempted login",
          "warning",
          req,
        );
        return res.status(403).json({ message: "Account suspended" });
      }

      adminUser.accountStatus = ACCOUNT_STATUS.ACTIVE;
      adminUser.lastLoginAt = new Date();
      await adminUser.save();

      const token = signToken(adminUser);

      await logActivity(
        adminUser.name || "Admin",
        "Admin Login",
        "Auth",
        `Admin ${adminUser.email} logged in`,
        "success",
        req,
      );

      return res.json({ token, user: toAuthUser(adminUser) });
    }

    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      await logActivity(
        trimmedEmail,
        "Login Failed",
        "Auth",
        "Invalid credentials",
        "error",
        req,
      );
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(trimmedPassword, user.password);
    if (!isValid) {
      await logActivity(
        trimmedEmail,
        "Login Failed",
        "Auth",
        "Invalid credentials",
        "error",
        req,
      );
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const normalizedRole = normalizeRole(user.role);
    const normalizedStatus = normalizeAccountStatus(user.accountStatus);

    if (isAdminPanelRequest(requestedRole) && normalizedRole !== ROLES.ADMIN) {
      await logActivity(
        trimmedEmail,
        "Admin Login Denied",
        "Auth",
        "Only admins can login from the admin panel",
        "warning",
        req,
      );
      return res
        .status(403)
        .json({ message: "Only admins can login from the admin panel" });
    }

    if (isUserPanelRequest(requestedRole) && normalizedRole === ROLES.ADMIN) {
      await logActivity(
        trimmedEmail,
        "User Login Denied",
        "Auth",
        "Admins must login from the admin panel",
        "warning",
        req,
      );
      return res
        .status(403)
        .json({ message: "Admins must login from the admin panel" });
    }

    if (normalizedStatus === ACCOUNT_STATUS.SUSPENDED) {
      await logActivity(
        user.name || trimmedEmail,
        "Login Denied",
        "Auth",
        "Suspended account attempted login",
        "warning",
        req,
      );
      return res.status(403).json({ message: "Account suspended" });
    }

    user.role = normalizedRole;
    user.accountStatus = normalizedStatus;
    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);

    await logActivity(
      user.name || trimmedEmail,
      "User Login",
      "Auth",
      `User ${user.email} logged in`,
      "success",
      req,
    );

    return res.json({ token, user: toAuthUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user: toSafeUser(user) });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ message: "Failed to get user" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    if (!req.user || !isAdminRole(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.json(users.map((user) => toSafeUser(user)));
  } catch (err) {
    console.error("Get users error:", err);
    return res.status(500).json({ message: "Failed to get users" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (!req.user || !isAdminRole(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hierarchy guard: do not allow removal of the last remaining Admin.
    if (normalizeRole(target.role) === ROLES.ADMIN) {
      const adminCount = await countAdmins();
      if (adminCount <= 1) {
        return res.status(400).json({ message: "Cannot delete the last remaining Admin" });
      }
    }

    await User.findByIdAndDelete(id);

    await logActivity(
      "User",
      "User Deleted",
      "User",
      `User ${target.name} (${target.email}) was deleted`,
      "warning",
      req,
    );

    return res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    return res.status(500).json({ message: "Failed to delete user" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    if (!req.user || !isAdminRole(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    const { name, email, password, role } = req.body;

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = {};

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ message: "Name is required" });
      }
      updateData.name = trimmedName;
    }

    if (email !== undefined) {
      const trimmedEmail = String(email).trim().toLowerCase();
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      updateData.email = trimmedEmail;
    }

    if (password) {
      if (String(password).trim().length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters long" });
      }
      updateData.password = await bcrypt.hash(String(password).trim(), 10);
    }

    if (role !== undefined) {
      const nextRole = normalizeRole(role);
      const currentRole = normalizeRole(target.role);

      // Hierarchy guard: do not demote the last remaining Admin.
      if (currentRole === ROLES.ADMIN && nextRole !== ROLES.ADMIN) {
        const adminCount = await countAdmins();
        if (adminCount <= 1) {
          return res.status(400).json({ message: "Cannot demote the last remaining Admin" });
        }
      }

      updateData.role = nextRole;
    }

    Object.assign(target, updateData);
    await target.save();

    const safeUser = await User.findById(id).select("-password");

    await logActivity(
      "User",
      "User Updated",
      "User",
      `User ${target.name} (${target.email}) was updated`,
      "success",
      req,
    );

    return res.json({ message: "User updated successfully", user: toSafeUser(safeUser) });
  } catch (err) {
    console.error("Update user error:", err);
    return res.status(500).json({ message: "Failed to update user" });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    if (!req.user || !isAdminRole(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    const { accountStatus } = req.body;

    const rawStatus = String(accountStatus || "").trim().toLowerCase();
    if (!["active", "suspended"].includes(rawStatus)) {
      return res.status(400).json({ message: "Invalid account status" });
    }
    const nextStatus = normalizeAccountStatus(accountStatus);

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hierarchy guard: prevent self-suspension for Admin.
    if (
      String(req.user.id) === String(target._id) &&
      nextStatus === ACCOUNT_STATUS.SUSPENDED
    ) {
      return res.status(400).json({ message: "You cannot suspend your own account" });
    }

    // Hierarchy guard: do not suspend the last active Admin.
    if (
      normalizeRole(target.role) === ROLES.ADMIN &&
      nextStatus === ACCOUNT_STATUS.SUSPENDED &&
      normalizeAccountStatus(target.accountStatus) === ACCOUNT_STATUS.ACTIVE
    ) {
      const activeAdminCount = await countAdmins({ onlyActive: true });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ message: "Cannot suspend the last remaining Admin" });
      }
    }

    target.accountStatus = nextStatus;
    await target.save();

    const safeUser = await User.findById(id).select("-password");

    await logActivity(
      "User",
      "User Status Updated",
      "User",
      `User ${target.name} (${target.email}) status changed to ${nextStatus}`,
      "success",
      req,
    );

    return res.json({ message: "User status updated successfully", user: toSafeUser(safeUser) });
  } catch (err) {
    console.error("Update user status error:", err);
    return res.status(500).json({ message: "Failed to update user status" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedPassword = newPassword?.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return res
        .status(400)
        .json({ message: "Email and new password are required" });
    }

    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (trimmedPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = await bcrypt.hash(trimmedPassword, 10);
    await user.save();

    await logActivity(
      user.name || trimmedEmail,
      "Password Reset",
      "Auth",
      `Password reset for ${user.email}`,
      "warning",
      req,
    );

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Failed to reset password" });
  }
};
