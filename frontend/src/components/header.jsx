import { Link, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

export default function Header({ portal = "student" }) {
  const { isAuthenticated, logout, user } = useAuth0();
  const navigate = useNavigate();
  const tutor = portal === "tutor";

  return <header className={`site-header ${tutor ? "tutor-header" : ""}`}>
    <Link className="brand" to={tutor ? "/tutor/dashboard" : "/home"}><span>Tu</span>torly <small>{tutor ? "Tutor Portal" : ""}</small></Link>
    <nav>
      {!tutor && <>
        <Link to="/home">Find tutors</Link>
        <Link to="/feed">Tutor feed</Link>
        <Link to="/how-it-works">How it works</Link>
        <Link to="/faq">FAQ</Link>
        {!isAuthenticated && <Link to="/tutor/signup">Become a tutor</Link>}
        {isAuthenticated && <Link to="/dashboard">My learning</Link>}
        {isAuthenticated && <Link to="/messages">Messages</Link>}
        {isAuthenticated && <Link to="/following-feed">Following feed</Link>}
        {isAuthenticated && <Link to="/following">Following</Link>}
        {isAuthenticated && <Link to="/saved-posts">Saved posts</Link>}
        {isAuthenticated && <Link to="/notifications">Notifications</Link>}
      </>}
      {tutor && <>
        <Link to="/tutor/dashboard">Dashboard</Link>
        <Link to="/tutor/requests">Requests</Link>
        <Link to="/tutor/posts">My posts</Link>
        <Link to="/tutor/followers">Followers</Link>
        <Link to="/tutor/feed">Tutor feed</Link>
        <Link to="/tutor/students">Students</Link>
        <Link to="/tutor/messages">Messages</Link>
        <Link to="/tutor/profile">My profile</Link>
        <Link to="/tutor/notifications">Notifications</Link>
        <Link to="/home">Student site</Link>
      </>}
    </nav>
    <div className="header-actions">
      {isAuthenticated ? <>
        <button className="avatar-btn" onClick={() => navigate(tutor ? "/tutor/profile" : "/student/profile")}>{(user?.name || "U")[0].toUpperCase()}</button>
        <button className="text-btn" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Logout</button>
      </> : <>
        <button className="text-btn" onClick={() => navigate("/tutor/login")}>Tutor login</button>
        <button className="primary small" onClick={() => navigate("/login")}>Student login</button>
      </>}
    </div>
  </header>;
}
