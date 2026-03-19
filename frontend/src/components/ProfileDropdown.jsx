import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Settings, Shield } from "lucide-react";
import { isAdminRole, normalizeRole, ROLES } from "../utils/roles";

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

const ProfileDropdown = ({ variant = "top" }) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    role: ROLES.EMPLOYEE,
    avatar: "",
  });

  useEffect(() => {
    const readLocal = () => {
      const name = localStorage.getItem("userName") || "";
      const email = localStorage.getItem("userEmail") || "";
      const role = normalizeRole(localStorage.getItem("role") || ROLES.EMPLOYEE);
      const avatar = localStorage.getItem("userAvatar") || "";
      setUserInfo({ name, email, role, avatar });
      return { name, email, role, avatar };
    };

    const { name, email, role, avatar } = readLocal();
    const token = localStorage.getItem("token");

    if (token && (!name || !email || !role || !avatar)) {
      axios
        .get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const user = res.data?.user;
          if (!user) return;
          const next = {
            name: user.name || "",
            email: user.email || "",
            role: normalizeRole(user.role || ROLES.EMPLOYEE),
            avatar: user.avatar || "",
          };
          setUserInfo(next);
          localStorage.setItem("userName", next.name);
          localStorage.setItem("userEmail", next.email);
          localStorage.setItem("role", next.role);
          if (next.avatar) {
            localStorage.setItem("userAvatar", next.avatar);
          }
        })
        .catch(() => {});
    }

    const handleStorage = (event) => {
      if (["userName", "userEmail", "role", "userAvatar"].includes(event.key)) {
        readLocal();
      }
    };
    const handleProfileUpdate = () => {
      readLocal();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleLogout = () => {
    delete axios.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userAvatar");
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/auth", { replace: true });
  };

  const initials = getInitials(userInfo.name, userInfo.email);
  const displayName = userInfo.name || "User";
  const displayEmail = userInfo.email || "user@example.com";
  const isSidebar = variant === "sidebar";
  const avatarUrl = userInfo.avatar
    ? userInfo.avatar.startsWith("http")
      ? userInfo.avatar
      : `http://localhost:5000${userInfo.avatar}`
    : "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          isSidebar
            ? "group flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 text-slate-900 shadow-lg shadow-slate-200/70 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:shadow-black/30 dark:hover:bg-white/10"
            : "group flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/90 px-3 py-2 text-slate-900 shadow-lg shadow-slate-200/70 backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:shadow-black/30 dark:hover:bg-slate-900"
        }
      >
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 text-sm font-semibold text-black">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold leading-tight">{displayName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {displayEmail}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`text-slate-500 transition dark:text-slate-400 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      <div
        role="menu"
        aria-hidden={!open}
        className={`${
          isSidebar
            ? "fixed left-6 bottom-24 w-72 origin-bottom-left"
            : "absolute right-0 mt-3 w-72 origin-top-right"
        } rounded-2xl border border-slate-200/80 bg-white p-3 text-slate-900 shadow-2xl shadow-slate-200/80 backdrop-blur transition dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-100 dark:shadow-black/40 ${
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
        style={isSidebar ? { zIndex: 60 } : undefined}
      >
        <div className="px-3 py-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {displayName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {displayEmail}
          </p>
        </div>
        <div className="my-2 border-t border-slate-200 dark:border-white/10" />

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            navigate("/settings");
          }}
          role="menuitem"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
        >
          <Settings size={16} className="text-slate-500 dark:text-slate-400" />
          Settings
        </button>

        {isAdminRole(userInfo.role) && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/admin");
            }}
            role="menuitem"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
          >
            <Shield size={16} className="text-slate-500 dark:text-slate-400" />
            Admin Panel
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setShowLogoutConfirm(true);
          }}
          role="menuitem"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-600 transition hover:bg-red-500/10 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
        >
          <LogOut size={16} className="text-red-500 dark:text-red-300" />
          Logout
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Confirm Logout
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to log out?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="flex-1 rounded-xl bg-red-500/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/30 hover:bg-red-500"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
