import { useEffect, useState } from "react";
import axios from "axios";
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  User,
  Check,
  X,
} from "lucide-react";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "user",
    password: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/auth/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setUsers(res.data || []);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(
          `http://localhost:5000/api/auth/users/${editingUser._id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
      } else {
        await axios.post("http://localhost:5000/api/auth/register", formData);
      }
      setShowAddModal(false);
      setEditingUser(null);
      setFormData({ username: "", email: "", role: "user", password: "" });
      fetchUsers();
    } catch (error) {
      console.error("Failed to save user", error);
      alert(error.response?.data?.message || "Failed to save user");
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email || "",
      role: user.role,
      password: "",
    });
    setShowAddModal(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      fetchUsers();
    } catch (error) {
      console.error("Failed to delete user", error);
      alert("Failed to delete user");
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingUser(null);
    setFormData({ username: "", email: "", role: "user", password: "" });
  };

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-xl">
            <Users className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              User Management
            </h1>
            <p className="text-slate-600 mt-1">
              Manage system users and permissions
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <UserPlus size={20} />
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">
                Total Users
              </p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {users.length}
              </p>
            </div>
            <Users className="text-purple-500" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">
                Admins
              </p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {users.filter((u) => u.role === "admin").length}
              </p>
            </div>
            <Shield className="text-cyan-500" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">
                Regular Users
              </p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {users.filter((u) => u.role === "user").length}
              </p>
            </div>
            <User className="text-green-500" size={40} />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">System Users</h2>
        </div>
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
              {users.map((user, idx) => (
                <tr
                  key={user._id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition"
                >
                  <td className="p-4 text-slate-600">{idx + 1}</td>
                  <td className="p-4 text-slate-900 font-medium">
                    {user.username}
                  </td>
                  <td className="p-4 text-slate-600">{user.email || "N/A"}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {user.role === "admin" ? (
                        <Shield size={12} />
                      ) : (
                        <User size={12} />
                      )}
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
                        onClick={() => handleEdit(user)}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center gap-1"
                      >
                        <Edit size={13} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
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
        {users.length === 0 && !loading && (
          <p className="text-center text-slate-500 py-8">No users found</p>
        )}
        {loading && (
          <p className="text-center text-slate-500 py-8">Loading users...</p>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingUser ? "Edit User" : "Add New User"}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition font-semibold flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  {editingUser ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
