import { useState } from "react";
import axios from "axios";
import { register, login } from "../Services/authApi";
import { useNavigate } from "react-router-dom";
import { Sparkles, Eye, EyeOff, X } from "lucide-react";

const Auth = () => {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginRole, setLoginRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const navigate = useNavigate();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const toggle = () => {
    setMode(mode === "login" ? "signup" : "login");
    setLoginRole("user");
    setError("");
    setShowPassword(false);
    setShowReset(false);
    setResetMessage("");
  };

  const validateForm = () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedName = name.trim();

    if (mode === "signup" && !trimmedName) {
      setError("Name is required");
      return false;
    }

    if (!trimmedEmail) {
      setError("Email is required");
      return false;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email");
      return false;
    }

    if (!trimmedPassword) {
      setError("Password is required");
      return false;
    }

    if (trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      let res;
      const data =
        mode === "signup"
          ? {
              name: name.trim(),
              email: email.trim().toLowerCase(),
              password: password.trim(),
            }
          : {
              email: email.trim().toLowerCase(),
              password: password.trim(),
              role: loginRole,
            };

      res = await (mode === "signup" ? register(data) : login(data));

      const { token } = res.data;
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const userRole = res.data?.user?.role || "Employee";
      const userName = res.data?.user?.name || "";
      const userEmail = res.data?.user?.email || email.trim().toLowerCase();
      localStorage.setItem("role", userRole);
      localStorage.setItem("userName", userName);
      localStorage.setItem("userEmail", userEmail);

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetMessage("");

    const trimmedEmail = resetEmail.trim().toLowerCase();
    const trimmedPassword = resetPassword.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setResetMessage("Email and new password are required");
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      setResetMessage("Please enter a valid email");
      return;
    }
    if (trimmedPassword.length < 6) {
      setResetMessage("Password must be at least 6 characters long");
      return;
    }

    setResetLoading(true);
    try {
      await axios.post("http://localhost:5000/api/auth/reset-password", {
        email: trimmedEmail,
        newPassword: trimmedPassword,
      });
      setResetMessage("Password reset successful. You can now sign in.");
      setResetEmail("");
      setResetPassword("");
      setShowResetPassword(false);
    } catch (err) {
      setResetMessage(err.response?.data?.message || "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-teal-50 relative overflow-hidden">
      {/* Premium animated background with vibrant teal */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-96 -right-96 w-[800px] h-[800px] bg-gradient-to-br from-cyan-400/40 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute -bottom-96 -left-96 w-[800px] h-[800px] bg-gradient-to-tr from-teal-400/40 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors duration-300 group"
      >
        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Home
      </button>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/90 backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-2xl border border-cyan-200/50 hover:border-cyan-300/60 transition-all duration-300">
          {/* Logo & Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="bg-gradient-to-br from-cyan-400 to-teal-500 p-5 rounded-2xl shadow-2xl shadow-cyan-500/50">
                <Sparkles className="w-12 h-12 text-black" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-slate-900 to-teal-700 bg-clip-text text-transparent">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-slate-600 text-center mb-8 text-sm">
            {mode === "login" 
              ? "Enter your credentials to access your dashboard" 
              : "Sign up to start analyzing your data"}
          </p>

          {mode === "login" && (
            <div className="flex bg-slate-100 backdrop-blur-md rounded-xl p-1 mb-6 border border-slate-300">
              <button
                type="button"
                onClick={() => setLoginRole("user")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  loginRole === "user"
                    ? "bg-gradient-to-r from-cyan-400 to-teal-500 text-black shadow-lg shadow-cyan-500/50"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                disabled={loading}
              >
                Employee
              </button>
              <button
                type="button"
                onClick={() => setLoginRole("admin")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  loginRole === "admin"
                    ? "bg-gradient-to-r from-cyan-400 to-teal-500 text-black shadow-lg shadow-cyan-500/50"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                disabled={loading}
              >
                Admin
              </button>
            </div>
          )}

          {/* Error Message */}
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 backdrop-blur-sm">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <div>
                <label className="block text-slate-700 text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 disabled:opacity-50 backdrop-blur-sm"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="block text-slate-700 text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                className="auth-fixed-input w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 disabled:opacity-50 backdrop-blur-sm"
                placeholder="Enter your email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-slate-700 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="auth-fixed-input w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 disabled:opacity-50 backdrop-blur-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-slate-500 text-xs mt-2">Must be at least 6 characters</p>
            </div>

            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setShowReset(true);
                    setResetMessage("");
                  }}
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              className="w-full bg-gradient-to-r from-cyan-400 to-teal-500 text-black py-3.5 rounded-xl font-semibold hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Please wait...
                </>
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-8 text-center border-t border-slate-300 pt-6">
            <p className="text-slate-600 text-sm">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button
              onClick={toggle}
              className="text-transparent bg-gradient-to-r from-cyan-400 to-teal-500 bg-clip-text font-semibold mt-1 disabled:opacity-50 hover:from-cyan-300 hover:to-teal-400 transition-all"
              disabled={loading}
            >
              {mode === "login" ? "Sign up for free" : "Sign in instead"}
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <p className="text-center text-slate-500 text-xs mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Reset Password
              </h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setShowReset(false)}
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Enter your email and a new password.
            </p>

            <form className="mt-4 space-y-4" onSubmit={handleResetPassword}>
              <div>
                <label className="block text-slate-700 text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 disabled:opacity-50"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={resetLoading}
                />
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-medium mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 disabled:opacity-50"
                    placeholder="Enter a new password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    disabled={resetLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    disabled={resetLoading}
                  >
                    {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {resetMessage && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                  {resetMessage}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-400 to-teal-500 text-black py-3 rounded-xl font-semibold hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={resetLoading}
              >
                {resetLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
