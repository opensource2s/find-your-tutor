import { useEffect, useState } from "react";
import Header from "../components/header";
import TutorCard from "../components/tutorCard";
import Footer from "../components/footer";
import { getAllTutors, getCourses, getCountries } from "../services/tutorApi";
import "../styles/app.css";

const initialFilters = { search: "", course: "", country: "", language: "", mode: "", level: "", minExperience: "", day: "", time: "", minRating: "", maxRate: "", sort: "rating" };

export default function Home() {
  const [tutors, setTutors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(initialFilters);

  const load = async (f = filters) => {
    setLoading(true);
    setError("");
    try {
      setTutors(await getAllTutors(Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ""))));
    } catch (err) {
      console.error("Tutor search failed:", err);
      setTutors([]);
      setError(err.response?.data?.message || "Could not load tutors. Check the backend and database migration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([getCourses(), getCountries()]).then(([c, n]) => { setCourses(c); setCountries(n); });
    load(initialFilters);
  }, []);

  const change = e => setFilters(v => ({ ...v, [e.target.name]: e.target.value }));
  const reset = () => { setFilters(initialFilters); load(initialFilters); };

  return <div>
    <Header />
    <main>
      <section className="hero-banner">
        <div className="hero-copy"><span className="eyebrow">PERSONAL LEARNING MARKETPLACE</span><h1>Find the right teacher for <em>exactly what you want to learn.</em></h1><p>Search C programming, React, DSA, communication and more. Compare experience, languages, reviews, availability and pricing, then message a tutor directly.</p><div className="hero-badges"><span>✓ Search by subject</span><span>✓ Detailed tutor profiles</span><span>✓ Direct messaging</span><span>✓ Read receipts</span></div></div>
        <div className="hero-number"><b>{tutors.length}</b><span>matching tutors</span></div>
      </section>

      <section className="search-panel">
        <div className="search-main"><span>⌕</span><input name="search" value={filters.search} onChange={change} onKeyDown={e => e.key === "Enter" && load()} placeholder="Try 'C language', React, Node.js, DSA, Telugu…" /><button className="primary" onClick={() => load()}>Find tutors</button></div>
        <div className="filters marketplace-filters">
          <select name="course" value={filters.course} onChange={change}><option value="">All courses</option>{courses.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select>
          <select name="country" value={filters.country} onChange={change}><option value="">Any country</option>{countries.map(c => <option key={c}>{c}</option>)}</select>
          <input name="language" value={filters.language} onChange={change} placeholder="Language e.g. Telugu" />
          <select name="mode" value={filters.mode} onChange={change}><option value="">Any teaching mode</option><option value="online">Online</option><option value="1-on-1">1-on-1</option><option value="group">Group</option></select>
          <select name="level" value={filters.level} onChange={change}><option value="">Any student level</option><option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Advanced">Advanced</option></select>
          <select name="minExperience" value={filters.minExperience} onChange={change}><option value="">Any experience</option><option value="2">2+ years</option><option value="5">5+ years</option><option value="10">10+ years</option></select>
          <select name="day" value={filters.day} onChange={change}><option value="">Any day</option>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
          <input type="time" name="time" value={filters.time} onChange={change} />
          <select name="minRating" value={filters.minRating} onChange={change}><option value="">Any rating</option><option value="4">4★ & up</option><option value="4.5">4.5★ & up</option></select>
          <input type="number" min="0" name="maxRate" value={filters.maxRate} onChange={change} placeholder="Max ₹/hour" />
          <select name="sort" value={filters.sort} onChange={change}><option value="rating">Top rated</option><option value="price">Lowest price</option><option value="experience">Most experienced</option></select>
          <button className="ghost" onClick={() => load()}>Apply filters</button>
          <button className="text-btn" onClick={reset}>Reset</button>
        </div>
      </section>

      <section className="section-wrap">
        {error && <div className="notice error">{error}</div>}
        <div className="section-title"><div><span className="eyebrow">DISCOVER</span><h2>Tutors matched to your learning goal</h2></div><p>{loading ? "Searching…" : `${tutors.length} tutors found`}</p></div>
        {!loading && tutors.length === 0 ? <div className="empty"><b>No matching tutors found.</b><span>Try “C Programming”, remove one filter, or increase your rate range.</span></div> : <div className="tutor-grid">{tutors.map(t => <TutorCard key={t.id} tutor={t} />)}</div>}
      </section>
    </main>
    <Footer/>
  </div>;
}
