import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import "../styles/auth.css";

export default function TutorLogin() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const startLogin = async (method) => {
    setBusy(method);
    setError("");
    try {
      sessionStorage.setItem("post_auth_flow", "login");
      sessionStorage.setItem("post_auth_role", "tutor");
      sessionStorage.setItem("post_auth_path", "/tutor/dashboard");

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
      console.error(err);
      setError("Could not open Auth0 sign-in. Check the Auth0 connection settings and try again.");
      setBusy("");
    }
  };

  if (!isLoading && isAuthenticated) {
    sessionStorage.setItem("post_auth_flow", "login");
    sessionStorage.setItem("post_auth_role", "tutor");
    sessionStorage.setItem("post_auth_path", "/tutor/dashboard");
    return <Navigate to="/" replace />;
  }

  return <div className="auth-shell tutor-auth">
    <section className="auth-hero"><div>
      <Link className="auth-brand" to="/home">Tutorly <small>Tutor Portal</small></Link>
      <span className="eyebrow">TEACH. CONNECT. GROW.</span>
      <h1>Run your tutoring practice from <em>one dashboard.</em></h1>
      <p>Review student requests, publish availability, manage sessions and chat with accepted students.</p>
    </div></section>
    <section className="auth-panel"><div className="auth-card">
      <span className="eyebrow">TUTOR ACCESS</span>
      <h2>Sign in as tutor</h2>
      <p>Choose email/password or email OTP. Auth0 handles both authentication methods.</p>
      {params.get("registered") === "1" && <div className="notice">Tutor registration completed successfully. Sign in to continue.</div>}
      {error && <div className="notice error" role="alert">{error}</div>}
      <button className="primary wide" onClick={() => startLogin("password")} disabled={!!busy || isLoading}>
        {busy === "password" ? "Opening sign-in…" : "Login with Email & Password →"}
      </button>
      <button className="secondary wide" onClick={() => startLogin("otp")} disabled={!!busy || isLoading}>
        {busy === "otp" ? "Opening OTP login…" : "Login with Email OTP"}
      </button>
      <div className="auth-note">Email OTP works only after the Email Passwordless connection is enabled for this Auth0 application.</div>
      <p className="switch-page">New tutor? <Link to="/tutor/signup">Create a tutor account</Link></p>
      <div className="portal-switch"><span>Looking for a tutor?</span><Link to="/login">Student sign in →</Link></div>
    </div></section>
  </div>;
}
