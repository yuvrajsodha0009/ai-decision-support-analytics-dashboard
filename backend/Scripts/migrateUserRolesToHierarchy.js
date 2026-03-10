require("dotenv").config();

const connectDB = require("../config/db");
const User = require("../models/User");
const {
  ROLES,
  ACCOUNT_STATUS,
  normalizeRole,
  normalizeAccountStatus,
} = require("../utils/roles");

async function migrateUserRolesToHierarchy() {
  const users = await User.find().select("_id role accountStatus");

  const bulkOps = [];
  let roleUpdates = 0;
  let statusUpdates = 0;

  for (const user of users) {
    const nextRole = normalizeRole(user.role);
    const nextStatus = normalizeAccountStatus(user.accountStatus);
    const update = {};

    if (user.role !== nextRole) {
      update.role = nextRole;
      roleUpdates += 1;
    }

    if (user.accountStatus !== nextStatus) {
      update.accountStatus = nextStatus;
      statusUpdates += 1;
    }

    if (Object.keys(update).length > 0) {
      bulkOps.push({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: update },
        },
      });
    }
  }

  if (bulkOps.length > 0) {
    await User.bulkWrite(bulkOps);
  }

  return {
    totalUsersScanned: users.length,
    updatedUsers: bulkOps.length,
    roleUpdates,
    statusBackfilled: statusUpdates,
    canonicalRoles: Object.values(ROLES),
    accountStatuses: Object.values(ACCOUNT_STATUS),
  };
}

async function run() {
  try {
    await connectDB();
    const summary = await migrateUserRolesToHierarchy();
    console.log("[migrate:roles] Completed", summary);
    process.exit(0);
  } catch (error) {
    console.error("[migrate:roles] Failed", error);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

module.exports = { migrateUserRolesToHierarchy };

