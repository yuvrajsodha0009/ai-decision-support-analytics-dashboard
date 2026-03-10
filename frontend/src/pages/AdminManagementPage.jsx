import { useEffect, useState } from "react";
import axios from "axios";
import {
  Users,
  Database,
  Activity,
  Settings,
  Edit,
  Trash2,
  Plus,
  X,
  Check,
  AlertCircle,
  TrendingUp,
  Shield,
  Crown,
  Briefcase,
  User,
} from "lucide-react";
import {
  ACCOUNT_STATUS,
  getRoleRank,
  isAdminRole,
  normalizeAccountStatus,
  normalizeRole,
  ROLES,
  ROLE_DESCRIPTIONS,
} from "../utils/roles";

const AdminManagementPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [activities, setActivities] = useState([]);
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingDataset, setEditingDataset] = useState(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: ROLES.EMPLOYEE,
    password: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type, id, name }
  const [statusLoadingById, setStatusLoadingById] = useState({});
  const [currentUser, setCurrentUser] = useState(() => ({
    id: null,
    email: (localStorage.getItem("userEmail") || "").toLowerCase(),
    role: normalizeRole(localStorage.getItem("role") || ROLES.EMPLOYEE),
  }));

  const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

  const ROLE_META = {
    [ROLES.ADMIN]: {
      label: ROLES.ADMIN,
      description: ROLE_DESCRIPTIONS[ROLES.ADMIN],
      badge:
        "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700",
      icon: Crown,
    },
    [ROLES.MANAGER]: {
      label: ROLES.MANAGER,
      description: ROLE_DESCRIPTIONS[ROLES.MANAGER],
      badge:
        "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700",
      icon: Briefcase,
    },
    [ROLES.EMPLOYEE]: {
      label: ROLES.EMPLOYEE,
      description: ROLE_DESCRIPTIONS[ROLES.EMPLOYEE],
      badge:
        "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700",
      icon: User,
    },
  };

  const getInitials = (name = "", email = "") => {
    const val = (name || "").trim() || (email || "").trim() || "U";
    const parts = val.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return val[0].toUpperCase();
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar) return "";
    if (avatar.startsWith("http")) return avatar;
    return `http://localhost:5000${avatar}`;
  };

  const normalizeUserRecord = (user = {}) => ({
    ...user,
    role: normalizeRole(user.role),
    accountStatus: normalizeAccountStatus(user.accountStatus),
    lastLoginAt: user.lastLoginAt || null,
  });

  const getRoleMeta = (role) => ROLE_META[normalizeRole(role)] || ROLE_META[ROLES.EMPLOYEE];

  const getRoleDisplayName = (role) => {
    const normalized = normalizeRole(role);
    return ROLE_META[normalized]?.label || ROLES.EMPLOYEE;
  };

  const getRoleBadgeClasses = (role) => getRoleMeta(role).badge;

  const getRoleDescription = (role) => getRoleMeta(role).description;

  const isCurrentUserRow = (user) => {
    const emailMatch =
      (user?.email || "").toLowerCase() &&
      (user?.email || "").toLowerCase() === currentUser.email;
    const idMatch = currentUser.id && String(user?._id) === String(currentUser.id);
    return Boolean(emailMatch || idMatch);
  };

  const getAdminCount = () =>
    users.filter((user) => normalizeRole(user.role) === ROLES.ADMIN).length;

  const canEditUser = (user) =>
    getRoleRank(currentUser.role) >= getRoleRank(user.role);

  const canDeleteUser = (user) => {
    if (!isAdminRole(currentUser.role)) return false;
    if (isCurrentUserRow(user)) return false;
    if (normalizeRole(user.role) === ROLES.ADMIN && getAdminCount() <= 1) return false;
    return true;
  };

  const canToggleUserStatus = (user) => {
    if (!isAdminRole(currentUser.role)) return false;
    if (isCurrentUserRow(user)) return false;
    if (
      normalizeRole(user.role) === ROLES.ADMIN &&
      normalizeAccountStatus(user.accountStatus) === ACCOUNT_STATUS.ACTIVE &&
      getAdminCount() <= 1
    ) {
      return false;
    }
    return true;
  };

  // Helper function to format large numbers
  const formatLargeNumber = (num) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + "B";
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toFixed(0);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      try {
        const meRes = await axios.get("http://localhost:5000/api/auth/me", {
          headers,
        });
        const meUser = meRes.data?.user;
        if (meUser) {
          setCurrentUser({
            id: meUser._id || meUser.id || null,
            email: (meUser.email || "").toLowerCase(),
            role: normalizeRole(meUser.role),
          });
        }
      } catch (error) {
        // Keep localStorage fallback if /me fails.
      }

      const usersRes = await axios.get("http://localhost:5000/api/auth/users", {
        headers,
      });
      const usersList = Array.isArray(usersRes.data)
        ? usersRes.data
        : usersRes.data?.users || [];
      const normalizedUsersList = usersList.map(normalizeUserRecord);
      setUsers(normalizedUsersList);

      const datasetsRes = await axios.get(
        "http://localhost:5000/api/data/all",
        {
          headers,
        },
      );
      const datasetsList = datasetsRes.data || [];
      setDatasets(datasetsList);

      // Fetch activities
      try {
        const activitiesRes = await axios.get(
          "http://localhost:5000/api/activity/all",
          { headers },
        );
        setActivities(activitiesRes.data || []);
      } catch (error) {
        console.error("Failed to fetch activities", error);
      }

      // Calculate stats based on fetched data
      const totalValue = datasetsList.reduce(
        (sum, d) => sum + (d.value || 0),
        0,
      );
      setSystemStats({
        totalUsers: normalizedUsersList.length,
        totalDatasets: datasetsList.length,
        totalValue: totalValue,
        activeUsers: normalizedUsersList.filter(
          (user) =>
            normalizeAccountStatus(user.accountStatus) === ACCOUNT_STATUS.ACTIVE,
        ).length,
      });
    } catch (error) {
      console.error("Failed to fetch data", error);
      setMessage("Failed to load data");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/auth/users", {
        headers,
      });
      const usersList = Array.isArray(res.data)
        ? res.data
        : res.data?.users || [];
      setUsers(usersList.map(normalizeUserRecord));
      console.log("Fetched users:", usersList);
    } catch (error) {
      console.error("Failed to fetch users", error);
      setMessage("Failed to load users");
      setMessageType("error");
    }
  };

  const fetchDatasets = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/data/all", {
        headers,
      });
      setDatasets(res.data || []);
    } catch (error) {
      console.error("Failed to fetch datasets", error);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/activity/all", {
        headers,
      });
      setActivities(res.data || []);
    } catch (error) {
      console.error("Failed to fetch activities", error);
    }
  };

  // User Management
  const handleSaveUser = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!userForm.name.trim()) {
      setMessage("Name/Username is required");
      setMessageType("error");
      return;
    }
    if (!userForm.password && !editingUser) {
      setMessage("Password is required for new users");
      setMessageType("error");
      return;
    }

    try {
      if (editingUser) {
        // Only send changed fields for edit
        const updateData = {
          name: userForm.name,
          email: userForm.email,
          role: normalizeRole(userForm.role),
        };
        if (userForm.password) {
          updateData.password = userForm.password;
        }
        await axios.put(
          `http://localhost:5000/api/auth/users/${editingUser._id}`,
          updateData,
          { headers },
        );
        setMessage("User updated successfully");
      } else {
        // For new user, send all fields
        const response = await axios.post(
          "http://localhost:5000/api/auth/register",
          {
            name: userForm.name,
            email: userForm.email || undefined,
            password: userForm.password,
            role: normalizeRole(userForm.role),
          },
          {
            headers,
          },
        );
        console.log("User created:", response.data);
        setMessage("User created successfully");
      }
      setMessageType("success");
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ name: "", email: "", role: ROLES.EMPLOYEE, password: "" });

      // Refresh users list
      setTimeout(() => {
        fetchUsers();
        setMessage(""); // Clear message after 3 seconds
      }, 1500);
    } catch (error) {
      console.error("Error saving user:", error);
      const errorMsg =
        error.response?.data?.message || error.message || "Failed to save user";
      setMessage(errorMsg);
      setMessageType("error");
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || user.username || "",
      email: user.email || "",
      role: normalizeRole(user.role),
      password: "",
    });
    setShowUserModal(true);
  };

  const handleToggleUserStatus = async (user) => {
    if (!canToggleUserStatus(user)) return;
    const nextStatus =
      normalizeAccountStatus(user.accountStatus) === ACCOUNT_STATUS.ACTIVE
        ? ACCOUNT_STATUS.SUSPENDED
        : ACCOUNT_STATUS.ACTIVE;

    try {
      setStatusLoadingById((prev) => ({ ...prev, [user._id]: true }));
      await axios.patch(
        `http://localhost:5000/api/auth/users/${user._id}/status`,
        { accountStatus: nextStatus },
        { headers },
      );
      setMessage("User status updated successfully");
      setMessageType("success");
      fetchUsers();
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to update user status";
      setMessage(errorMsg);
      setMessageType("error");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setStatusLoadingById((prev) => {
        const next = { ...prev };
        delete next[user._id];
        return next;
      });
    }
  };

  const handleDeleteUser = (userId, userName) => {
    setConfirmAction({ type: "deleteUser", id: userId, name: userName });
    setShowConfirmModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!confirmAction) return;
    try {
      await axios.delete(
        `http://localhost:5000/api/auth/users/${confirmAction.id}`,
        {
          headers,
        },
      );
      setMessage("User deleted successfully");
      setMessageType("success");
      fetchUsers();
      setShowConfirmModal(false);
      setConfirmAction(null);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Failed to delete user");
      setMessageType("error");
      setShowConfirmModal(false);
      setConfirmAction(null);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Dataset Management
  const handleDeleteDataset = (datasetId, datasetName) => {
    setConfirmAction({
      type: "deleteDataset",
      id: datasetId,
      name: datasetName,
    });
    setShowConfirmModal(true);
  };

  const confirmDeleteDataset = async () => {
    if (!confirmAction) return;
    try {
      await axios.delete(`http://localhost:5000/api/data/${confirmAction.id}`, {
        headers,
      });
      setMessage("Dataset deleted successfully");
      setMessageType("success");
      fetchDatasets();
      setShowConfirmModal(false);
      setConfirmAction(null);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Failed to delete dataset");
      setMessageType("error");
      setShowConfirmModal(false);
      setConfirmAction(null);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleUpdateDataset = async (datasetId) => {
    const newValue = prompt("Enter new value:");
    if (newValue === null) return;

    try {
      await axios.put(
        `http://localhost:5000/api/data/${datasetId}`,
        { value: parseFloat(newValue) },
        { headers },
      );
      setMessage("Dataset updated successfully");
      setMessageType("success");
      fetchDatasets();
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Failed to update dataset");
      setMessageType("error");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      ((u.email || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())),
  );

  const userKpis = {
    totalUsers: users.length,
    activeUsers: users.filter(
      (u) => normalizeAccountStatus(u.accountStatus) === ACCOUNT_STATUS.ACTIVE,
    ).length,
    managers: users.filter((u) => normalizeRole(u.role) === ROLES.MANAGER).length,
    admins: users.filter((u) => normalizeRole(u.role) === ROLES.ADMIN).length,
  };

  const filteredDatasets = datasets.filter(
    (d) =>
      (d.title && d.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.batchId && d.batchId.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="p-8 min-h-screen bg-[var(--bg-page)] text-[var(--text-main)]">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-xl">
            <Settings className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[var(--text-main)]">
              Admin Management
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Complete system control and monitoring
            </p>
          </div>
        </div>
        <button
          onClick={fetchAllData}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl border-l-4 animate-slide-in ${
            messageType === "success"
              ? "bg-green-50 border-l-green-500 text-green-700"
              : "bg-red-50 border-l-red-500 text-red-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{message}</span>
            <button
              onClick={() => setMessage("")}
              className="text-lg opacity-50 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 surface-card rounded-xl shadow-lg p-2">
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "users", label: "User Management" },
          { id: "datasets", label: "Dataset Management" },
          { id: "activity", label: "System Activity" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                : "text-[var(--text-main)] hover:bg-[var(--bg-page)] border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Stats */}
      {activeTab === "dashboard" && systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="surface-card rounded-2xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">
                  Total Users
                </p>
                <p className="text-3xl font-bold text-[var(--text-main)] mt-2">
                  {systemStats.totalUsers}
                </p>
              </div>
              <Users className="text-indigo-500" size={40} />
            </div>
          </div>

          <div className="surface-card rounded-2xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">
                  Active Users
                </p>
                <p className="text-3xl font-bold text-[var(--text-main)] mt-2">
                  {systemStats.activeUsers}
                </p>
              </div>
              <TrendingUp className="text-green-500" size={40} />
            </div>
          </div>

          <div className="surface-card rounded-2xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">
                  Total Datasets
                </p>
                <p className="text-3xl font-bold text-[var(--text-main)] mt-2">
                  {systemStats.totalDatasets}
                </p>
              </div>
              <Database className="text-cyan-500" size={40} />
            </div>
          </div>

          <div className="surface-card rounded-2xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">
                  Total Value
                </p>
                <p className="text-3xl font-bold text-[var(--text-main)] mt-2">
                  ₹{formatLargeNumber((systemStats.totalValue || 0) * 83)}
                </p>
              </div>
              <Shield className="text-purple-500" size={40} />
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="surface-card rounded-xl p-5 border border-[var(--border-soft)]">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Total Users
              </p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-3xl font-bold text-[var(--text-main)]">
                  {userKpis.totalUsers}
                </p>
                <Users className="text-indigo-500" size={24} />
              </div>
            </div>
            <div className="surface-card rounded-xl p-5 border border-[var(--border-soft)]">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Active Users
              </p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-3xl font-bold text-[var(--text-main)]">
                  {userKpis.activeUsers}
                </p>
                <TrendingUp className="text-emerald-500" size={24} />
              </div>
            </div>
            <div className="surface-card rounded-xl p-5 border border-[var(--border-soft)]">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Managers
              </p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-3xl font-bold text-[var(--text-main)]">
                  {userKpis.managers}
                </p>
                <Briefcase className="text-blue-500" size={24} />
              </div>
            </div>
            <div className="surface-card rounded-xl p-5 border border-[var(--border-soft)]">
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Admins
              </p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-3xl font-bold text-[var(--text-main)]">
                  {userKpis.admins}
                </p>
                <Crown className="text-amber-500" size={24} />
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control flex-1 px-4 py-3 rounded-lg"
            />
            <button
              onClick={() => {
                setEditingUser(null);
                setUserForm({
                  name: "",
                  email: "",
                  role: ROLES.EMPLOYEE,
                  password: "",
                });
                setShowUserModal(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Add User
            </button>
          </div>

          <div className="surface-card rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-[var(--border-soft)]">
                  <tr className="text-left text-xs uppercase text-slate-700 font-semibold">
                    <th className="p-4">#</th>
                    <th className="p-4">Username</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Last Login</th>
                    <th className="p-4">Created</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, idx) => {
                    const roleMeta = getRoleMeta(user.role);
                    const RoleIcon = roleMeta.icon;
                    const accountStatus = normalizeAccountStatus(user.accountStatus);
                    const isActive = accountStatus === ACCOUNT_STATUS.ACTIVE;
                    const editDisabled = !canEditUser(user);
                    const deleteAllowed = canDeleteUser(user);
                    const statusToggleAllowed = canToggleUserStatus(user);
                    const statusBusy = Boolean(statusLoadingById[user._id]);

                    return (
                      <tr
                        key={user._id}
                        className="border-b border-[var(--border-soft)] hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        <td className="p-4 text-slate-600">{idx + 1}</td>
                        <td className="p-4 text-slate-900 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 overflow-hidden rounded-full border border-[var(--border-soft)] bg-[var(--bg-surface)] flex items-center justify-center text-sm font-semibold text-[var(--text-main)]">
                              {getAvatarUrl(user.avatar) ? (
                                <img
                                  src={getAvatarUrl(user.avatar)}
                                  alt={user.name || "User"}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitials(user.name, user.email)
                              )}
                            </div>
                            <span>{user.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">
                          {user.email || "N/A"}
                        </td>
                        <td className="p-4">
                          <span
                            title={getRoleDescription(user.role)}
                            className={`badge-soft ${getRoleBadgeClasses(
                              user.role,
                            )}`}
                          >
                            <RoleIcon size={12} />
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                isActive
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700"
                                  : "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-700"
                              }`}
                            >
                              {accountStatus}
                            </span>
                            {isAdminRole(currentUser.role) && (
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isActive}
                                disabled={!statusToggleAllowed || statusBusy}
                                onClick={() => handleToggleUserStatus(user)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                  isActive ? "bg-emerald-500" : "bg-slate-500"
                                } ${
                                  !statusToggleAllowed || statusBusy
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                    isActive ? "translate-x-6" : "translate-x-1"
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-slate-700 text-sm">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleString()
                            : "Never"}
                        </td>
                        <td className="p-4 text-slate-700 text-sm">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 items-center">
                            <button
                              disabled={editDisabled}
                              onClick={() => handleEditUser(user)}
                              className={`px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs rounded-lg shadow-md transition-all flex items-center gap-1 ${
                                editDisabled
                                  ? "opacity-50 cursor-not-allowed hover:scale-100"
                                  : "hover:shadow-lg hover:scale-105"
                              }`}
                            >
                              <Edit size={13} />
                              Edit
                            </button>
                            {deleteAllowed ? (
                              <button
                                onClick={() =>
                                  handleDeleteUser(
                                    user._id,
                                    user.name || user.email || "User",
                                  )
                                }
                                className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-red-500 text-white text-xs rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center gap-1"
                              >
                                <Trash2 size={13} />
                                Delete
                              </button>
                            ) : (
                              <span className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border-soft)] text-slate-500">
                                Protected
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <p className="text-center text-slate-500 py-8">
                No users found matching your search
              </p>
            )}
          </div>
        </div>
      )}

      {/* Datasets Tab */}
      {activeTab === "datasets" && (
        <div className="space-y-6">
          <input
            type="text"
            placeholder="Search datasets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control w-full px-4 py-3 rounded-lg"
          />

          <div className="surface-card rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="table-head border-b border-[var(--border-soft)]">
                  <tr className="text-left text-xs uppercase font-semibold text-[var(--text-main)]">
                    <th className="p-4">#</th>
                    <th className="p-4">Title</th>
                    <th className="p-4">Value</th>
                    <th className="p-4">Batch ID</th>
                    <th className="p-4">Uploaded</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDatasets.slice(0, 50).map((dataset, idx) => (
                    <tr
                      key={dataset._id}
                      className="table-row table-row-hover transition"
                    >
                      <td className="p-4 text-[var(--text-main)]">{idx + 1}</td>
                      <td className="p-4 text-[var(--text-main)] font-semibold">
                        {dataset.title || "N/A"}
                      </td>
                      <td className="p-4 text-green-500 dark:text-green-300 font-semibold">
                        ₹{formatLargeNumber((dataset.value || 0) * 83)}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                        {dataset.batchId
                          ? dataset.batchId.substring(0, 8) + "..."
                          : "N/A"}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                        {dataset.uploadedAt
                          ? new Date(dataset.uploadedAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateDataset(dataset._id)}
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center gap-1"
                          >
                            <Edit size={13} />
                            Update
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteDataset(
                                dataset._id,
                                dataset.name || "Dataset",
                              )
                            }
                            className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-red-500 text-white text-xs rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center gap-1"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredDatasets.length === 0 && (
              <p className="text-center text-slate-500 py-8">
                No datasets found matching your search
              </p>
            )}
          </div>
          <p className="text-sm text-slate-500 text-right">
            Showing {filteredDatasets.slice(0, 50).length} of{" "}
            {filteredDatasets.length} datasets
          </p>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          <div className="surface-card rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-[var(--border-soft)]">
              <h2 className="text-xl font-semibold text-[var(--text-main)] flex items-center gap-2">
                <Activity className="text-indigo-500" />
                Recent System Activity
              </h2>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="table-head border-b border-[var(--border-soft)]">
                  <tr className="text-left text-xs uppercase font-semibold text-[var(--text-main)]">
                    <th className="p-4">#</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Resource</th>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.length > 0 ? (
                    activities.slice(0, 50).map((activity, idx) => (
                      <tr
                        key={activity._id || idx}
                        className="table-row table-row-hover transition"
                      >
                        <td className="p-4 text-slate-600 dark:text-slate-300">{idx + 1}</td>
                        <td className="p-4 text-[var(--text-main)] font-medium">
                          {activity.user || "System"}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                            {activity.action || "N/A"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-700">
                          {activity.resource || "N/A"}
                        </td>
                        <td className="p-4 text-slate-700 text-sm">
                          {activity.timestamp
                            ? new Date(activity.timestamp).toLocaleString()
                            : "N/A"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              activity.status === "success"
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-red-100 text-red-700 border border-red-200"
                            }`}
                          >
                            {activity.status || "completed"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-8 text-center text-slate-500"
                      >
                        <AlertCircle className="inline mr-2" size={20} />
                        No activity logs available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="surface-card rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingUser ? "Edit User" : "Add New User"}
              </h2>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">
                  Name / Username
                </label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, name: e.target.value })
                  }
                  className="form-control w-full px-4 py-3 rounded-lg"
                  placeholder="Enter name or username"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  className="form-control w-full px-4 py-3 rounded-lg"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  className="form-control w-full px-4 py-3 rounded-lg"
                  placeholder={
                    editingUser
                      ? "Leave blank to keep current"
                      : "Enter password"
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">
                  Role
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({ ...userForm, role: e.target.value })
                  }
                  className="form-control w-full px-4 py-3 rounded-lg"
                >
                  <option value={ROLES.EMPLOYEE}>Employee</option>
                  <option value={ROLES.MANAGER}>Manager</option>
                  <option value={ROLES.ADMIN}>Admin</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                  }}
                  className="flex-1 px-4 py-3 border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-semibold flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  {editingUser ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="surface-card rounded-2xl shadow-2xl max-w-sm w-full animate-fadeIn p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-100 rounded-full">
                <AlertCircle className="text-red-600" size={32} />
              </div>
            </div>

            {/* Title and Message */}
            <h3 className="text-2xl font-bold text-center text-[var(--text-main)] mb-3">
              Confirm Delete
            </h3>
            <p className="text-center text-slate-600 dark:text-slate-300 mb-8">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                "{confirmAction.name}"
              </span>
              ?
              <br />
              <span className="text-sm text-slate-500 mt-2 inline-block">
                This action cannot be undone.
              </span>
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                className="flex-1 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === "deleteUser") {
                    confirmDeleteUser();
                  } else if (confirmAction.type === "deleteDataset") {
                    confirmDeleteDataset();
                  }
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagementPage;
