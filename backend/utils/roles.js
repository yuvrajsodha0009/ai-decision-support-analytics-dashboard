const ROLES = Object.freeze({
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  ADMIN: "Admin",
});

const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
});

const ROLE_RANK = Object.freeze({
  [ROLES.EMPLOYEE]: 1,
  [ROLES.MANAGER]: 2,
  [ROLES.ADMIN]: 3,
});

const normalizeRole = (role) => {
  const raw = String(role || "").trim().toLowerCase();

  if (raw === "admin" || raw === "ceo") return ROLES.ADMIN;
  if (raw === "manager") return ROLES.MANAGER;
  if (raw === "employee" || raw === "user") return ROLES.EMPLOYEE;

  return ROLES.EMPLOYEE;
};

const normalizeAccountStatus = (status) => {
  const raw = String(status || "").trim().toLowerCase();

  if (raw === "suspended") return ACCOUNT_STATUS.SUSPENDED;
  return ACCOUNT_STATUS.ACTIVE;
};

const getRoleRank = (role) => ROLE_RANK[normalizeRole(role)] || ROLE_RANK[ROLES.EMPLOYEE];

const isAdminRole = (role) => normalizeRole(role) === ROLES.ADMIN;

const canEditTarget = (actorRole, targetRole) =>
  getRoleRank(actorRole) >= getRoleRank(targetRole);

const canDeleteTarget = (actorRole, targetRole) =>
  getRoleRank(actorRole) > getRoleRank(targetRole);

module.exports = {
  ROLES,
  ACCOUNT_STATUS,
  ROLE_RANK,
  normalizeRole,
  normalizeAccountStatus,
  getRoleRank,
  isAdminRole,
  canEditTarget,
  canDeleteTarget,
};

