import {BrowserRouter,Navigate,Route,Routes} from "react-router-dom";
import Login from "./pages/login";
import Signup from "./pages/signup";
import Home from "./pages/home";
import TutorDetails from "./pages/tutorDetails";
import StudentDashboard from "./pages/studentDashboard";
import StudentProfile from "./pages/studentProfile";
import TutorLogin from "./pages/tutorLogin";
import TutorSignup from "./pages/tutorSignup";
import TutorDashboard from "./pages/tutorDashboard";
import TutorOnboarding from "./pages/tutorOnboarding";
import TutorProfile from "./pages/tutorProfile";
import TutorRequests from "./pages/tutorRequests";
import TutorStudents from "./pages/tutorStudents";
import Notifications from "./pages/notifications";
import InfoPage from "./pages/infoPage";
import Chat from "./pages/chat";
import AuthLanding from "./pages/authLanding";
import ProtectedRoute from "./components/protectedRoute";
import ErrorBoundary from "./components/errorBoundary";
import Feed from "./pages/feed";
import PostDetails from "./pages/postDetails";
import TutorPosts from "./pages/tutorPosts";
import PostEditor from "./pages/postEditor";
import SavedPosts from "./pages/savedPosts";
import Following from "./pages/following";
import FollowingFeed from "./pages/followingFeed";
import TutorFollowers from "./pages/tutorFollowers";


import "./styles/app.css";

export default function App(){return <ErrorBoundary><BrowserRouter><Routes>
  <Route path="/" element={<AuthLanding/>}/>
  <Route path="/home" element={<Home/>}/>
  <Route path="/login" element={<Login/>}/>
  <Route path="/signup" element={<Signup/>}/>
  <Route path="/tutor/login" element={<TutorLogin/>}/>
  <Route path="/tutor/signup" element={<TutorSignup/>}/>
  <Route path="/tutors/:id" element={<TutorDetails/>}/>
  <Route path="/feed" element={<Feed/>}/>
  <Route path="/posts/:id" element={<PostDetails/>}/>

  <Route path="/about" element={<InfoPage page="about"/>}/>
  <Route path="/how-it-works" element={<InfoPage page="how-it-works"/>}/>
  <Route path="/faq" element={<InfoPage page="faq"/>}/>
  <Route path="/rules" element={<InfoPage page="rules"/>}/>
  <Route path="/safety" element={<InfoPage page="safety"/>}/>
  <Route path="/terms" element={<InfoPage page="terms"/>}/>
  <Route path="/privacy" element={<InfoPage page="privacy"/>}/>
  <Route path="/copyright" element={<InfoPage page="copyright"/>}/>
  <Route path="/contact" element={<InfoPage page="contact"/>}/>

  <Route path="/dashboard" element={<ProtectedRoute><StudentDashboard/></ProtectedRoute>}/>
  <Route path="/student/profile" element={<ProtectedRoute><StudentProfile/></ProtectedRoute>}/>
  <Route path="/messages" element={<ProtectedRoute><Chat/></ProtectedRoute>}/>
  <Route path="/notifications" element={<ProtectedRoute><Notifications/></ProtectedRoute>}/>
  <Route path="/saved-posts" element={<ProtectedRoute><SavedPosts/></ProtectedRoute>}/>
  <Route path="/following" element={<ProtectedRoute><Following/></ProtectedRoute>}/>
  <Route path="/following-feed" element={<ProtectedRoute><FollowingFeed/></ProtectedRoute>}/>

  <Route path="/tutor/onboarding" element={<ProtectedRoute tutor><TutorOnboarding/></ProtectedRoute>}/>
  <Route path="/tutor/dashboard" element={<ProtectedRoute tutor><TutorDashboard/></ProtectedRoute>}/>
  <Route path="/tutor/profile" element={<ProtectedRoute tutor><TutorProfile/></ProtectedRoute>}/>
  <Route path="/tutor/requests" element={<ProtectedRoute tutor><TutorRequests/></ProtectedRoute>}/>
  <Route path="/tutor/students" element={<ProtectedRoute tutor><TutorStudents/></ProtectedRoute>}/>
  <Route path="/tutor/messages" element={<ProtectedRoute tutor><Chat portal="tutor"/></ProtectedRoute>}/>
  <Route path="/tutor/notifications" element={<ProtectedRoute tutor><Notifications portal="tutor"/></ProtectedRoute>}/>
  <Route path="/tutor/feed" element={<ProtectedRoute tutor><Feed portal="tutor"/></ProtectedRoute>}/>
  <Route path="/tutor/posts" element={<ProtectedRoute tutor><TutorPosts/></ProtectedRoute>}/>
  <Route path="/tutor/followers" element={<ProtectedRoute tutor><TutorFollowers/></ProtectedRoute>}/>
  <Route path="/tutor/posts/new" element={<ProtectedRoute tutor><PostEditor/></ProtectedRoute>}/>
  <Route path="/tutor/posts/:id/edit" element={<ProtectedRoute tutor><PostEditor/></ProtectedRoute>}/>

  <Route path="*" element={<Navigate to="/home" replace/>}/>
</Routes></BrowserRouter></ErrorBoundary>}
