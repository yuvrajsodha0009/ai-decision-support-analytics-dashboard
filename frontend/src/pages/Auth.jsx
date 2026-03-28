import { useState } from "react";
import axios from "axios";
import {
  login,
  requestPasswordOtp,
  resetPassword as resetPasswordRequest,
} from "../Services/authApi";
import { useNavigate } from "react-router-dom";
import { Sparkles, Eye, EyeOff, X, ArrowRight, ArrowLeft } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginRole, setLoginRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetOldPassword, setResetOldPassword] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetMethod, setResetMethod] = useState("otp");
  const [resetMessage, setResetMessage] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetOldPassword, setShowResetOldPassword] = useState(false);
  const [cardTransform, setCardTransform] = useState(
    "perspective(1000px) rotateX(0deg) rotateY(0deg)",
  );
  const [cardGlow, setCardGlow] = useState({ x: 50, y: 25 });
  const navigate = useNavigate();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const labelClass = "mb-2 block text-sm font-semibold text-slate-100";
  const primaryInputClass =
    "w-full rounded-xl border border-slate-400/70 bg-slate-900 px-4 py-3 text-slate-50 placeholder-slate-300 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-all duration-300 disabled:opacity-50";
  const passwordInputClass = `${primaryInputClass} pr-12`;

  const validateForm = () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

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
      const data = {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role: loginRole,
      };

      const res = await login(data);

      const { token } = res.data;
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const userRole = res.data?.user?.role || "Employee";
      const userName = res.data?.user?.name || "";
      const userEmail = res.data?.user?.email || email.trim().toLowerCase();
      localStorage.setItem("role", userRole);
      localStorage.setItem("userName", userName);
      localStorage.setItem("userEmail", userEmail);
      window.dispatchEvent(new Event("auth-changed"));

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
    const trimmedPassword = resetNewPassword.trim();
    const trimmedOldPassword = resetOldPassword.trim();
    const trimmedOtp = resetOtp.trim();

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

    if (resetMethod === "oldPassword" && !trimmedOldPassword) {
      setResetMessage("Old password is required");
      return;
    }

    if (resetMethod === "otp" && !trimmedOtp) {
      setResetMessage("OTP is required");
      return;
    }

    setResetLoading(true);
    try {
      await resetPasswordRequest({
        email: trimmedEmail,
        newPassword: trimmedPassword,
        oldPassword:
          resetMethod === "oldPassword" ? trimmedOldPassword : undefined,
        otp: resetMethod === "otp" ? trimmedOtp : undefined,
      });
      setResetMessage("Password reset successful. You can now sign in.");
      setResetEmail("");
      setResetNewPassword("");
      setResetOldPassword("");
      setResetOtp("");
      setShowResetPassword(false);
      setShowResetOldPassword(false);
    } catch (err) {
      setResetMessage(
        err.response?.data?.message || "Failed to reset password",
      );
    } finally {
      setResetLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setResetMessage("");
    const trimmedEmail = resetEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      setResetMessage("Email is required to send OTP");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setResetMessage("Please enter a valid email");
      return;
    }

    setSendingOtp(true);
    try {
      const response = await requestPasswordOtp({ email: trimmedEmail });
      const backendMessage =
        response.data?.message || "OTP has been sent to your email";
      const devOtp = response.data?.devOtp;
      setResetMessage(
        devOtp ? `${backendMessage} OTP: ${devOtp}` : backendMessage,
      );
    } catch (err) {
      setResetMessage(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12
      ? "Good Morning"
      : greetingHour < 18
        ? "Good Afternoon"
        : "Good Evening";

  const handleCardMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const rotateY = ((x - 50) / 50) * 6;
    const rotateX = ((50 - y) / 50) * 5;

    setCardTransform(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`,
    );
    setCardGlow({ x, y });
  };

  const resetCardMotion = () => {
    setCardTransform("perspective(1000px) rotateX(0deg) rotateY(0deg)");
    setCardGlow({ x: 50, y: 25 });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.2),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.16),transparent_35%),linear-gradient(135deg,#020617_0%,#0b1324_52%,#101827_100%)] px-4 py-14 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:radial-gradient(circle_at_center,black_10%,transparent_85%)]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />
        <div className="auth-orb auth-orb-three" />
      </div>

      <button
        onClick={() => navigate("/")}
        className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-full border border-slate-500/80 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-50 backdrop-blur-md transition-all duration-300 hover:-translate-x-0.5 hover:border-cyan-300/80 hover:text-cyan-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </button>

      <div className="relative z-10 mx-auto w-full max-w-md pt-8 sm:pt-10">
        <div
          className="group relative overflow-hidden rounded-[28px] border border-slate-400/45 bg-slate-950/82 p-7 shadow-[0_30px_80px_rgba(8,47,73,0.55)] backdrop-blur-2xl transition-transform duration-300 sm:p-9"
          onMouseMove={handleCardMouseMove}
          onMouseLeave={resetCardMotion}
          style={{
            transform: cardTransform,
            transformStyle: "preserve-3d",
          }}
        >
          <div
            className="pointer-events-none absolute -inset-24 opacity-50 blur-3xl transition-opacity duration-300 group-hover:opacity-75"
            style={{
              background: `radial-gradient(circle at ${cardGlow.x}% ${cardGlow.y}%, rgba(45,212,191,0.4), rgba(14,116,144,0.1) 38%, transparent 70%)`,
            }}
          />

          <div className="relative z-10">
            <div className="mb-7 flex justify-center">
              <div className="rounded-2xl border border-cyan-200/40 bg-gradient-to-br from-cyan-300 to-emerald-300 p-4 shadow-[0_15px_40px_rgba(45,212,191,0.35)]">
                <Sparkles className="h-9 w-9 text-slate-950" />
              </div>
            </div>

            <div className="mb-6 space-y-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                {greeting}
              </p>
              <h2 className="text-3xl font-extrabold text-slate-50">
                Welcome Back
              </h2>
              <p className="text-sm text-slate-200">
                Secure sign in for analytics dashboard access.
              </p>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-500/90 bg-slate-900/90 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setLoginRole("user")}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300 ${
                    loginRole === "user"
                      ? "bg-slate-50 text-slate-950 ring-2 ring-cyan-300/90 shadow-[0_8px_20px_rgba(125,211,252,0.35)]"
                      : "text-slate-300 hover:bg-slate-700/70 hover:text-slate-100"
                  }`}
                  disabled={loading}
                >
                  Employee
                </button>
                <button
                  type="button"
                  onClick={() => setLoginRole("admin")}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300 ${
                    loginRole === "admin"
                      ? "bg-slate-50 text-slate-950 ring-2 ring-cyan-300/90 shadow-[0_8px_20px_rgba(125,211,252,0.35)]"
                      : "text-slate-300 hover:bg-slate-700/70 hover:text-slate-100"
                  }`}
                  disabled={loading}
                >
                  Admin
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                <span className="h-2 w-2 rounded-full bg-rose-300" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClass}>Email Address</label>
                <input
                  className={`auth-fixed-input ${primaryInputClass}`}
                  placeholder="Enter your email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`auth-fixed-input ${passwordInputClass}`}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-cyan-200"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-200">
                  Must be at least 6 characters
                </p>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setShowReset(true);
                    setResetMessage("");
                  }}
                  className="text-sm font-semibold text-cyan-100 transition-colors hover:text-cyan-50"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>

              <button
                className="relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-300 py-3.5 font-semibold text-slate-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_15px_40px_rgba(45,212,191,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                <span className="absolute inset-y-0 -left-8 w-8 -skew-x-12 bg-white/40 blur-sm transition-all duration-700 group-hover:left-[110%]" />
                {loading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Please wait...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-7 text-center text-xs text-slate-200/80">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-cyan-400/25 bg-slate-900/90 p-6 text-slate-100 shadow-[0_25px_80px_rgba(8,47,73,0.55)] animate-[authFadeIn_0.25s_ease-out]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-cyan-100">
                Reset Password
              </h3>
              <button
                type="button"
                className="rounded-md p-1 text-slate-400 transition-colors hover:text-slate-100"
                onClick={() => setShowReset(false)}
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-300">
              Reset using old password or OTP sent to email.
            </p>

            <div className="mt-4 flex rounded-xl border border-slate-700 bg-slate-800/70 p-1">
              <button
                type="button"
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  resetMethod === "otp"
                    ? "border border-cyan-300/60 bg-cyan-500/15 text-cyan-100"
                    : "text-slate-300 hover:text-white"
                }`}
                onClick={() => setResetMethod("otp")}
                disabled={resetLoading || sendingOtp}
              >
                Email OTP
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  resetMethod === "oldPassword"
                    ? "border border-cyan-300/60 bg-cyan-500/15 text-cyan-100"
                    : "text-slate-300 hover:text-white"
                }`}
                onClick={() => setResetMethod("oldPassword")}
                disabled={resetLoading || sendingOtp}
              >
                Old Password
              </button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleResetPassword}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-500 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-400 transition-all duration-300 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={resetLoading}
                />
              </div>

              {resetMethod === "otp" ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-semibold text-slate-200">
                      OTP
                    </label>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-100 disabled:opacity-50"
                      disabled={resetLoading || sendingOtp}
                    >
                      {sendingOtp ? "Sending..." : "Send OTP"}
                    </button>
                  </div>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-500 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-400 transition-all duration-300 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                    placeholder="Enter 6-digit OTP"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    disabled={resetLoading}
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Old Password
                  </label>
                  <div className="relative">
                    <input
                      type={showResetOldPassword ? "text" : "password"}
                      className="w-full rounded-xl border border-slate-500 bg-slate-800 px-4 py-3 pr-12 text-slate-100 placeholder-slate-400 transition-all duration-300 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                      placeholder="Enter old password"
                      value={resetOldPassword}
                      onChange={(e) => setResetOldPassword(e.target.value)}
                      disabled={resetLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetOldPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-100"
                      disabled={resetLoading}
                    >
                      {showResetOldPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-slate-500 bg-slate-800 px-4 py-3 pr-12 text-slate-100 placeholder-slate-400 transition-all duration-300 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                    placeholder="Enter a new password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    disabled={resetLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-100"
                    disabled={resetLoading}
                  >
                    {showResetPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {resetMessage && (
                <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">
                  {resetMessage}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-cyan-300 to-emerald-300 py-3 font-semibold text-slate-950 transition-all duration-300 hover:shadow-[0_14px_34px_rgba(45,212,191,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={resetLoading}
              >
                {resetLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes authFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -22px, 0);
          }
        }

        @keyframes authFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .auth-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(44px);
          animation: authFloat 10s ease-in-out infinite;
        }

        .auth-orb-one {
          top: -90px;
          right: -70px;
          height: 280px;
          width: 280px;
          background: rgba(6, 182, 212, 0.28);
        }

        .auth-orb-two {
          bottom: -90px;
          left: -60px;
          height: 300px;
          width: 300px;
          background: rgba(16, 185, 129, 0.24);
          animation-delay: 1.4s;
        }

        .auth-orb-three {
          top: 35%;
          right: 18%;
          height: 180px;
          width: 180px;
          background: rgba(45, 212, 191, 0.18);
          animation-delay: 0.8s;
        }
      `}</style>
    </div>
  );
};

export default Auth;
