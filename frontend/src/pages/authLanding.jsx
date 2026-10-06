import { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../services/api";

export default function AuthLanding() {
  const {
    isAuthenticated,
    isLoading,
    error,
    getAccessTokenSilently,
    loginWithRedirect
  } = useAuth0();

  const navigate = useNavigate();
  const redirected = useRef(false);
  const [message, setMessage] = useState("Opening Tutorly…");

  useEffect(() => {
    if (isLoading || redirected.current) return;

    const finish = async () => {
      if (error) {
        console.error("Auth0 callback error:", error);
        setMessage(error.message || "Sign-in could not be completed.");
        return;
      }

      const logoutTarget = sessionStorage.getItem("post_logout_path");
      if (!isAuthenticated && logoutTarget) {
        sessionStorage.removeItem("post_logout_path");
        navigate(logoutTarget, { replace: true });
        return;
      }

      if (!isAuthenticated) {
        navigate("/home", { replace: true });
        return;
      }

      redirected.current = true;

      const role = sessionStorage.getItem("post_auth_role");
      const storedPath = sessionStorage.getItem("post_auth_path");
      const defaultPath = role === "tutor" ? "/tutor/dashboard" : role === "student" ? "/dashboard" : "/home";
      const targetPath = storedPath?.startsWith("/") && !storedPath.startsWith("//") ? storedPath : defaultPath;

      if (!role) {
        navigate(targetPath, { replace: true });
        return;
      }

      try {
        setMessage("Verifying your Tutorly profile…");

        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            scope: "openid profile email",
          },
        });

        const response = await fetch(`${API_URL}/api/auth/signin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 404 && data.code === "REGISTRATION_REQUIRED") {
          const signupPath = role === "tutor" ? "/tutor/signup" : "/signup";
          sessionStorage.removeItem("post_auth_flow");
          sessionStorage.removeItem("post_auth_path");
          sessionStorage.removeItem("post_auth_role");
          navigate(signupPath, { replace: true });
          return;
        }

        if (!response.ok) throw new Error(data.message || "Unable to verify your profile.");

        sessionStorage.removeItem("post_auth_flow");
        sessionStorage.removeItem("post_auth_path");
        sessionStorage.removeItem("post_auth_role");
        navigate(targetPath, { replace: true });
      } catch (err) {
        console.error("Tutorly auth completion error:", err);

        const authCode = err?.error || err?.code;
        if (authCode === "consent_required" || authCode === "login_required") {
          redirected.current = false;
          setMessage("Completing authorization…");
          await loginWithRedirect({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE,
              scope: "openid profile email",
              prompt: "consent",
            },
          });
          return;
        }

        setMessage(err.message || "Sign-in could not be completed.");
        redirected.current = false;
      }
    };

    finish();
  }, [isAuthenticated, isLoading, error, getAccessTokenSilently, loginWithRedirect, navigate]);

  if (error) {
    return <div className="page-loader" role="alert">
      Sign-in could not be completed. <Link to="/login">Student login</Link> · <Link to="/tutor/login">Tutor login</Link>
    </div>;
  }

  return <div className="page-loader">{message}</div>;
}
