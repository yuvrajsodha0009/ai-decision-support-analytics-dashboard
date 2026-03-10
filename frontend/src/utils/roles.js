export const ROLES = Object.freeze({
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  ADMIN: "Admin",
});

export const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
});

export const ROLE_DESCRIPTIONS = Object.freeze({
  [ROLES.EMPLOYEE]: "View-only access to dashboards.",
  [ROLES.MANAGER]: "Can manage datasets and upload data.",
  [ROLES.ADMIN]: "Full system authority.",
});

const ROLE_RANK = Object.freeze({
  [ROLES.EMPLOYEE]: 1,
  [ROLES.MANAGER]: 2,
  [ROLES.ADMIN]: 3,
});

export const normalizeRole = (role) => {
  const raw = String(role || "").trim().toLowerCase();

  if (raw === "admin" || raw === "ceo") return ROLES.ADMIN;
  if (raw === "manager") return ROLES.MANAGER;
  if (raw === "employee" || raw === "user") return ROLES.EMPLOYEE;

  return ROLES.EMPLOYEE;
};

export const normalizeAccountStatus = (status) => {
  const raw = String(status || "").trim().toLowerCase();
  return raw === "suspended" ? ACCOUNT_STATUS.SUSPENDED : ACCOUNT_STATUS.ACTIVE;
};

export const getRoleRank = (role) =>
  ROLE_RANK[normalizeRole(role)] || ROLE_RANK[ROLES.EMPLOYEE];

export const isAdminRole = (role) => normalizeRole(role) === ROLES.ADMIN;

