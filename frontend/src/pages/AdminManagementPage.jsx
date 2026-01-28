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
  Eye,
} from "lucide-react";

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
    role: "user",
    password: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type, id, name }

  const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchUsers(),
        fetchDatasets(),
        fetchActivities(),
        fetchSystemStats(),
      ]);
    } catch (error) {
      console.error("Failed to fetch data", error);
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
      setUsers(usersList);
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

  const fetchSystemStats = async () => {
    try {
      const userCount = users.length;
      const datasetCount = datasets.length;
      const totalValue = datasets.reduce((sum, d) => sum + (d.value || 0), 0);

      setSystemStats({
        totalUsers: userCount,
        totalDatasets: datasetCount,
        totalValue: totalValue,
        activeUsers: Math.ceil(userCount * 0.7),
      });
    } catch (error) {
      console.error("Failed to fetch system stats", error);
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
          role: userForm.role,
        };
        if (userForm.password) {
          updateData.password = userForm.password;
        }
        await axios.put(
          `http://localhost:5000/api/auth/users/${editingUser._id}`,
          updateData,
          { headers }
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
            role: userForm.role,
          },
          {
            headers,
          }
        );
        console.log("User created:", response.data);
        setMessage("User created successfully");
      }
      setMessageType("success");
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ name: "", email: "", role: "user", password: "" });

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
      role: user.role,
      password: "",
    });
    setShowUserModal(true);
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
        }
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
        { headers }
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
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredDatasets = datasets.filter(
    (d) =>
      (d.title && d.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.batchId && d.batchId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-xl">
            <Settings className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Admin Management
            </h1>
            <p className="text-slate-600 mt-1">
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

      {/* Dashboard Stats */}
      {activeTab === "dashboard" && systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">
                  Total Users
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {systemStats.totalUsers}
                </p>
              </div>
              <Users className="text-indigo-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">
                  Active Users
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {systemStats.activeUsers}
                </p>
              </div>
              <TrendingUp className="text-green-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">
                  Total Datasets
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {systemStats.totalDatasets}
                </p>
              </div>
              <Database className="text-cyan-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">
                  Total Value
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  ${(systemStats.totalValue || 0).toFixed(2)}
                </p>
              </div>
              <Shield className="text-purple-500" size={40} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white rounded-xl shadow-lg p-2 border border-slate-200">
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
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              onClick={() => {
                setEditingUser(null);
                setUserForm({
                  username: "",
                  email: "",
                  role: "user",
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

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs uppercase text-slate-600 font-semibold">
                    <th className="p-4">#</th>
                    <th className="p-4">Username</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Created</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, idx) => (
                    <tr
                      key={user._id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="p-4 text-slate-600">{idx + 1}</td>
                      <td className="p-4 text-slate-900 font-medium">
                        {user.name}
                      </td>
                      <td className="p-4 text-slate-600">
                        {user.email || "N/A"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === "admin"
                              ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          <Shield size={12} />
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center gap-1"
                          >
                            <Edit size={13} />
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteUser(user._id, user.name)
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
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs uppercase text-slate-600 font-semibold">
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
                      className="border-b border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="p-4 text-slate-600">{idx + 1}</td>
                      <td className="p-4 text-slate-900 font-medium">
                        {dataset.title || "N/A"}
                      </td>
                      <td className="p-4 text-green-600 font-semibold">
                        ${(dataset.value || 0).toFixed(2)}
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
                        {dataset.batchId
                          ? dataset.batchId.substring(0, 8) + "..."
                          : "N/A"}
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
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
                                dataset.name || "Dataset"
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
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="text-indigo-500" />
                Recent System Activity
              </h2>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs uppercase text-slate-600 font-semibold">
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
                        className="border-b border-slate-100 hover:bg-slate-50 transition"
                      >
                        <td className="p-4 text-slate-600">{idx + 1}</td>
                        <td className="p-4 text-slate-900 font-medium">
                          {activity.user || "System"}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                            {activity.action || "N/A"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">
                          {activity.resource || "N/A"}
                        </td>
                        <td className="p-4 text-slate-600 text-sm">
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Name / Username
                </label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Enter name or username"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder={
                    editingUser
                      ? "Leave blank to keep current"
                      : "Enter password"
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Role
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({ ...userForm, role: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                  }}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-semibold"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-fadeIn p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-100 rounded-full">
                <AlertCircle className="text-red-600" size={32} />
              </div>
            </div>

            {/* Title and Message */}
            <h3 className="text-2xl font-bold text-center text-slate-900 mb-3">
              Confirm Delete
            </h3>
            <p className="text-center text-slate-600 mb-8">
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
                className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
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
