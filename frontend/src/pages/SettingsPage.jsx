import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Bell, Lock, Sliders, User } from "lucide-react";
import SettingsTabs from "../components/settings/SettingsTabs";
import ToggleSwitch from "../components/settings/ToggleSwitch";
import { useAnalyticsFilters } from "../context/AnalyticsFiltersContext";
import { usePreferences } from "../context/PreferencesContext";
import { formatAnalyticsDateRangeSummary } from "../utils/analyticsDateRange";

const getInitialNotifications = () => {
  const defaults = {
    emailAlerts: true,
    weeklySummary: true,
    dataQuality: true,
  };

  try {
    const raw = localStorage.getItem("userNotifications");
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
};

const getInitials = (name, email) => {
  const trimmed = (name || "").trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (first + last || first).toUpperCase();
  }
  if (email) return email[0]?.toUpperCase() || "U";
  return "U";
};

const SettingsCard = ({ title, description, children }) => {
  return (
    <div className="settings-card rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-6 shadow-lg">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-[var(--text-main)]">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
};

const SettingsPage = () => {
  const tabs = useMemo(
    () => [
      {
        id: "profile",
        label: "Profile",
        caption: "Personal info",
        icon: User,
      },
      {
        id: "security",
        label: "Security",
        caption: "Password settings",
        icon: Lock,
      },
      {
        id: "preferences",
        label: "Preferences",
        caption: "Theme & display",
        icon: Sliders,
      },
      {
        id: "notifications",
        label: "Notifications",
        caption: "Alerts & reports",
        icon: Bell,
      },
    ],
    []
  );

  const [activeTab, setActiveTab] = useState("profile");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "user",
    createdAt: "",
    avatar: "",
  });
  const [profileName, setProfileName] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const { preferences, updatePreferences } = usePreferences();
  const { savedDateRange, saveDateRangePreference, isSavingDatePreference } =
    useAnalyticsFilters();
  const [notifications, setNotifications] = useState(getInitialNotifications);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setProfileError("Missing authentication token.");
      setLoadingProfile(false);
      return;
    }

    axios
      .get("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const user = res.data?.user;
        if (!user) {
          setProfileError("Failed to load profile.");
          return;
        }
        setProfile({
          name: user.name || "",
          email: user.email || "",
          role: user.role || "Employee",
          createdAt: user.createdAt || "",
          avatar: user.avatar || "",
        });
        setProfileName(user.name || "");
        if (user.avatar) {
          localStorage.setItem("userAvatar", user.avatar);
        }
      })
      .catch(() => {
        setProfileError("Failed to load profile.");
      })
      .finally(() => {
        setLoadingProfile(false);
      });
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleProfileSave = async () => {
    const trimmedName = profileName.trim();
    if (!trimmedName) {
      toast.error("Full name is required.");
      return;
    }
    if (trimmedName.length < 2) {
      toast.error("Full name must be at least 2 characters long.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Missing authentication token.");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await axios.put(
        "http://localhost:5000/api/users/update-profile",
        { name: trimmedName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedUser = res.data?.user;
      if (updatedUser) {
        setProfile({
          name: updatedUser.name || "",
          email: updatedUser.email || "",
          role: updatedUser.role || "user",
          createdAt: updatedUser.createdAt || "",
          avatar: updatedUser.avatar || "",
        });
        setProfileName(updatedUser.name || "");

        localStorage.setItem("userName", updatedUser.name || "");
        localStorage.setItem("userEmail", updatedUser.email || "");
        localStorage.setItem("role", updatedUser.role || "user");
        if (updatedUser.avatar) {
          localStorage.setItem("userAvatar", updatedUser.avatar);
        }
        window.dispatchEvent(new Event("profile-updated"));
      }

      toast.success("Profile updated successfully.");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("All password fields are required.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Missing authentication token.");
      return;
    }

    setChangingPassword(true);
    try {
      await axios.put(
        "http://localhost:5000/api/users/change-password",
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Password updated successfully.");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB.");
      event.target.value = "";
      return;
    }

    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    event.target.value = "";
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      toast.error("Choose a profile image first.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Missing authentication token.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      const res = await axios.put(
        "http://localhost:5000/api/users/update-avatar",
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedUser = res.data?.user;
      const newAvatar = res.data?.avatar || updatedUser?.avatar || "";
      if (updatedUser) {
        setProfile({
          name: updatedUser.name || "",
          email: updatedUser.email || "",
          role: updatedUser.role || "user",
          createdAt: updatedUser.createdAt || "",
          avatar: updatedUser.avatar || newAvatar || "",
        });
      } else {
        setProfile((prev) => ({ ...prev, avatar: newAvatar }));
      }

      localStorage.setItem("userAvatar", newAvatar);
      window.dispatchEvent(new Event("profile-updated"));

      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview("");
      setAvatarFile(null);

      toast.success("Profile picture updated.");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update profile picture."
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveNotifications = () => {
    localStorage.setItem("userNotifications", JSON.stringify(notifications));
    toast.success("Notification preferences saved.");
  };

  const formattedCreatedAt = profile.createdAt
    ? new Date(profile.createdAt).toLocaleString()
    : "—";

  const canSaveProfile =
    profileName.trim().length >= 2 && profileName.trim() !== profile.name;

  const avatarSource = avatarPreview || profile.avatar;
  const avatarUrl =
    avatarSource && !avatarSource.startsWith("blob:")
      ? avatarSource.startsWith("http")
        ? avatarSource
        : `http://localhost:5000${avatarSource}`
      : avatarSource;
  const initials = getInitials(profile.name, profile.email);

  return (
    <div className="settings-page min-h-screen p-6 text-[var(--text-main)] lg:p-10 bg-[var(--bg-page)]">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">Personal Settings</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Manage your account, security, and preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px,1fr]">
        <aside className="settings-tabs-panel rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-4 shadow-xl">
          <SettingsTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </aside>

        <section className="settings-panel rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-6 shadow-xl">
          <div key={activeTab} className="animate-fadeIn space-y-6">
            {activeTab === "profile" && (
              <>
                <SettingsCard
                  title="Personal Information"
                  description="Update your name and review account details."
                >
                  {profileError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {profileError}
                    </div>
                  )}

                  <div className="settings-subpanel flex flex-wrap items-center gap-5 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-cyan-400/30 bg-slate-950/60 text-lg font-semibold text-cyan-100">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-200">
                        Profile picture
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <label
                          htmlFor="avatar-upload"
                          className="cursor-pointer rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                        >
                          Choose Photo
                        </label>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={handleAvatarUpload}
                          disabled={!avatarFile || uploadingAvatar}
                          className="rounded-xl bg-gradient-to-r from-cyan-400 to-teal-500 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-cyan-500/20 transition hover:shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {uploadingAvatar ? "Uploading..." : "Upload Photo"}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">
                        JPG, PNG, or WebP up to 2MB.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-slate-300">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        disabled={loadingProfile}
                        className="form-control settings-input mt-2 w-full rounded-xl px-4 py-3 text-sm"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-300">
                        Role
                      </label>
                      <div className="mt-2">
                        <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                          {profile.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-slate-300">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        readOnly
                        className="form-control settings-input mt-2 w-full rounded-xl px-4 py-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-300">
                        Created At
                      </label>
                      <input
                        type="text"
                        value={formattedCreatedAt}
                        readOnly
                        className="form-control settings-input mt-2 w-full rounded-xl px-4 py-3 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleProfileSave}
                      disabled={savingProfile || !canSaveProfile}
                      className="rounded-xl bg-gradient-to-r from-cyan-400 to-teal-500 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-cyan-500/20 transition hover:shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingProfile ? "Saving..." : "Save Changes"}
                    </button>
                    <p className="text-xs text-slate-400">
                      Changes update your profile instantly.
                    </p>
                  </div>
                </SettingsCard>
              </>
            )}

            {activeTab === "security" && (
              <SettingsCard
                title="Change Password"
                description="Keep your account secure with a strong password."
              >
                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      className="form-control settings-input mt-2 w-full rounded-xl px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      className="form-control settings-input mt-2 w-full rounded-xl px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="form-control settings-input mt-2 w-full rounded-xl px-4 py-3 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="rounded-xl bg-gradient-to-r from-cyan-400 to-teal-500 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-cyan-500/20 transition hover:shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {changingPassword ? "Updating..." : "Update Password"}
                  </button>
                  <p className="text-xs text-slate-400">
                    Minimum 6 characters required.
                  </p>
                </div>
              </SettingsCard>
            )}

            {activeTab === "preferences" && (
              <>
                <SettingsCard
                  title="Theme"
                  description="Choose the look and feel of your dashboard."
                >
                  <div className="flex flex-wrap gap-3">
                    {["dark", "light"].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updatePreferences({ theme: value })}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                          preferences.theme === value
                            ? "border-cyan-300 bg-cyan-50 text-cyan-700 shadow-sm dark:border-cyan-400/60 dark:bg-cyan-400/10 dark:text-cyan-100"
                            : "border-slate-200 text-slate-600 hover:border-cyan-300 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:border-cyan-400/40 dark:hover:text-slate-100"
                        }`}
                      >
                        {value === "dark" ? "Dark" : "Light"}
                      </button>
                    ))}
                  </div>
                </SettingsCard>

                <SettingsCard
                  title="Default Date Range"
                  description="Pick the initial range for analytics."
                >
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: "Today", value: "today" },
                      { label: "7d", value: "last7" },
                      { label: "30d", value: "last30" },
                      { label: "90d", value: "last90" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => saveDateRangePreference({ preset: option.value })}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                          savedDateRange.preset === option.value
                            ? "border-cyan-300 bg-cyan-50 text-cyan-700 shadow-sm dark:border-cyan-400/60 dark:bg-cyan-400/10 dark:text-cyan-100"
                            : "border-slate-200 text-slate-600 hover:border-cyan-300 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:border-cyan-400/40 dark:hover:text-slate-100"
                        }`}
                        disabled={isSavingDatePreference}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {savedDateRange.preset === "custom" && (
                    <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-slate-200">
                      <p className="font-semibold text-cyan-100">Custom</p>
                      <p className="mt-1 text-xs text-slate-300">
                        {formatAnalyticsDateRangeSummary(
                          savedDateRange.start,
                          savedDateRange.end
                        )}
                      </p>
                    </div>
                  )}
                </SettingsCard>

                <SettingsCard
                  title="Display Density"
                  description="Adjust spacing in data tables."
                >
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: "Compact", value: "compact" },
                      { label: "Comfortable", value: "comfortable" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          updatePreferences({ density: option.value })
                        }
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                          preferences.density === option.value
                            ? "border-cyan-300 bg-cyan-50 text-cyan-700 shadow-sm dark:border-cyan-400/60 dark:bg-cyan-400/10 dark:text-cyan-100"
                            : "border-slate-200 text-slate-600 hover:border-cyan-300 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:border-cyan-400/40 dark:hover:text-slate-100"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </SettingsCard>

                <SettingsCard
                  title="Animations"
                  description="Control motion effects across the dashboard."
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        Enable animations
                      </p>
                      <p className="text-xs text-slate-500">
                        Turn off to reduce motion.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={preferences.animations}
                      onChange={(value) =>
                        updatePreferences({ animations: value })
                      }
                    />
                  </div>
                </SettingsCard>
              </>
            )}

            {activeTab === "notifications" && (
              <SettingsCard
                title="Notification Preferences"
                description="Choose how you want to stay informed."
              >
                <div className="settings-subpanel flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        Email alerts
                      </p>
                    <p className="text-xs text-slate-500">
                      Receive important updates via email.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={notifications.emailAlerts}
                    onChange={(value) =>
                      setNotifications((prev) => ({
                        ...prev,
                        emailAlerts: value,
                      }))
                    }
                  />
                </div>

                <div className="settings-subpanel flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Weekly report summary
                    </p>
                    <p className="text-xs text-slate-500">
                      Get a weekly roundup of insights.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={notifications.weeklySummary}
                    onChange={(value) =>
                      setNotifications((prev) => ({
                        ...prev,
                        weeklySummary: value,
                      }))
                    }
                  />
                </div>

                <div className="settings-subpanel flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Data quality alerts
                    </p>
                    <p className="text-xs text-slate-500">
                      Be notified when data drops below threshold.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={notifications.dataQuality}
                    onChange={(value) =>
                      setNotifications((prev) => ({
                        ...prev,
                        dataQuality: value,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveNotifications}
                    className="rounded-xl bg-gradient-to-r from-cyan-400 to-teal-500 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-cyan-500/20 transition hover:shadow-cyan-500/40"
                  >
                    Save Preferences
                  </button>
                  <p className="text-xs text-slate-400">
                    Changes are stored locally.
                  </p>
                </div>
              </SettingsCard>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
