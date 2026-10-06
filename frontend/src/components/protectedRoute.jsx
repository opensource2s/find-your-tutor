import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router-dom";
export default function ProtectedRoute({ children, tutor=false }) {
  const { isAuthenticated, isLoading } = useAuth0();
  if (isLoading) return <div className="page-loader">Checking your session…</div>;
  if (!isAuthenticated) return <Navigate to={tutor?"/tutor/login":"/login"} replace />;
  return children;
}
