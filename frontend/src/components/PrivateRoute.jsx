import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { me } from "../Services/authApi";
import { isAdminRole, normalizeRole, ROLES } from "../utils/roles";

const PrivateRoute = ({ children, requireAdmin = false }) => {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      setOk(false);
      return;
    }

    me(token)
      .then(() => setOk(true))
      .catch(() => setOk(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Checking authentication...</div>;
  if (!ok) return <Navigate to="/auth" replace />;

  const role = normalizeRole(localStorage.getItem("role") || ROLES.EMPLOYEE);
  if (requireAdmin && !isAdminRole(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PrivateRoute;
