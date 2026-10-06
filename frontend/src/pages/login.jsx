import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import "../styles/auth.css";

export default function Login() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const startLogin = async (method) => {
    setBusy(method);
    setError("");

    try {
      sessionStorage.setItem("post_auth_flow", "login");
      sessionStorage.setItem("post_auth_role", "student");
      sessionStorage.setItem("post_auth_path", "/dashboard");

      const connection = method === "otp"
        ? (import.meta.env.VITE_AUTH0_EMAIL_CONNECTION || "email")
        : (import.meta.env.VITE_AUTH0_DB_CONNECTION || "Username-Password-Authentication");

      await loginWithRedirect({
        authorizationParams: {
          connection,
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: "openid profile email",
          prompt: "login",
        },
      });
    } catch (err) {
      console.error("Auth0 student login error:", err);
      setError("Could not open Auth0 sign-in. Check the Auth0 application and connection settings.");
      setBusy("");
    }
  };

  if (!isLoading && isAuthenticated) {
    sessionStorage.setItem("post_auth_flow", "login");
    sessionStorage.setItem("post_auth_role", "student");
    sessionStorage.setItem("post_auth_path", "/dashboard");
    return <Navigate to="/" replace />;
  }

  return <div className="auth-shell">
    <section className="auth-hero"><div>
      <Link className="auth-brand" to="/home">Tutorly</Link>
      <span className="eyebrow">LEARN ON YOUR SCHEDULE</span>
      <h1>Find the tutor who fits your <em>time, goals and style.</em></h1>
      <p>Search by course, country, language, rating, budget and weekly availability. Message first, then connect when you are ready.</p>
      <div className="auth-stats"><b>50</b><span>max students per tutor</span><b>1:1</b><span>personal learning</span></div>
    </div></section>

    <section className="auth-panel"><div className="auth-card">
      <span className="eyebrow">STUDENT ACCESS</span>
      <h2>Welcome back</h2>
      <p>Choose how you want Auth0 to verify your identity.</p>

      {params.get("registered") === "1" && <div className="notice">Registration completed successfully. Sign in to continue.</div>}
      {error && <div className="notice error" role="alert">{error}</div>}

      <button className="primary wide" onClick={() => startLogin("password")} disabled={!!busy || isLoading}>
        {busy === "password" ? "Opening sign-in…" : "Login with Email & Password →"}
      </button>

      <button className="secondary wide" onClick={() => startLogin("otp")} disabled={!!busy || isLoading}>
        {busy === "otp" ? "Opening OTP login…" : "Login with Email OTP"}
      </button>

      <div className="auth-note">Email OTP can be enabled later. Email/password is the primary test flow now.</div>
      <p className="switch-page">New student? <Link to="/signup">Create account</Link></p>
      <div className="portal-switch"><span>Are you a tutor?</span><Link to="/tutor/login">Open Tutor Portal →</Link></div>
    </div></section>
  </div>;
}
