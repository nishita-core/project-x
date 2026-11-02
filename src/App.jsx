import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./supabase";
import ShadowDashboard from "./ShadowDashboard";
import WinterArc from "./WinterArc";
import Notes from "./Notes";
import SyllabusTracker from "./SyllabusTracker";
import FocusHub from "./FocusHub";
import Profile from "./Profile";
import Dashboard from "./Dashboard";
import "./App.css";

export default function App() {
  const [logoClicks, setLogoClicks] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState(null);
  const [showPortal, setShowPortal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (mounted) {
          setSession(data.session);
        }
      } catch (error) {
        if (mounted) {
          setAuthError(error.message || "Could not check your session.");
        }
      } finally {
        if (mounted) {
          setLoadingSession(false);
        }
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function handleLogoClick() {
    setLogoClicks((previousClicks) => {
      const nextClicks = previousClicks + 1;

      if (nextClicks >= 3) {
        setShowPortal(true);
        setAuthMessage("");
        setAuthError("");
        return 0;
      }

      return nextClicks;
    });
  }

  function resetAuthMessages() {
    setAuthMessage("");
    setAuthError("");
  }

  async function handleAuth(event) {
    event.preventDefault();
    resetAuthMessages();
    setLoadingAuth(true);

    try {
      const cleanEmail = email.trim();

      if (isSignup) {
        if (password.length < 8) {
          throw new Error("Your password must be at least 8 characters.");
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        if (data.session) {
          setSession(data.session);
          setAuthMessage("Account created successfully!");
        } else {
          setAuthMessage(
            "Account request submitted! Check your email for a confirmation link if email confirmation is enabled."
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        setSession(data.session);
        setAuthMessage("Welcome to the Shadow Realm.");
      }
    } catch (error) {
      setAuthError(
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoadingAuth(false);
    }
  }

  async function handleLogout() {
    setAuthError("");
    setAuthMessage("");
    setLoadingAuth(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setSession(null);
      setEmail("");
      setPassword("");
      setIsSignup(false);
      setAuthMessage("You have signed out successfully.");
    } catch (error) {
      setAuthError(error.message || "Logout failed. Please try again.");
    } finally {
      setLoadingAuth(false);
    }
  }

  function closePortal() {
    setShowPortal(false);
    setAuthError("");
    setAuthMessage("");
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <button
          type="button"
          className="brand"
          onClick={handleLogoClick}
          aria-label="PROJECT X logo"
        >
          <span className="brand-symbol">◈</span>
          <span>
            PROJECT<span className="brand-accent"> X</span>
          </span>
        </button>

        <button
          type="button"
          className="menu-trigger"
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
          <span className="menu-trigger-label">MENU</span>
        </button>
      </header>

      {menuOpen && (
        <div
          className="menu-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false);
          }}
        >
          <aside className="side-menu" aria-label="Main navigation">
            <div className="side-menu-heading">
              <div>
                <span className="side-menu-kicker">PROJECT X</span>
                <h2>Explore.</h2>
              </div>

              <button
                type="button"
                className="menu-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                ×
              </button>
            </div>

            <p className="side-menu-caption">MOVE THROUGH THE EXPERIENCE</p>

            <nav className="side-menu-links">
              <a href="#home" onClick={() => setMenuOpen(false)}>
                <span>01</span> Home <b>↗</b>
              </a>

              <a href="#vision" onClick={() => setMenuOpen(false)}>
                <span>02</span> Features <b>↗</b>
              </a>

              <a href="#help" onClick={() => setMenuOpen(false)}>
                <span>03</span> Help <b>↗</b>
              </a>
            </nav>

            <div className="side-menu-bottom">
              <span>HAVE A QUESTION?</span>
              <p>Visit the Help section to find support information.</p>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  document.getElementById("help")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
              >
                Go to Help <span>↗</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <section className="hero" id="home">
        <div className="hero-copy">
          <div className="status-pill">
            <span className="status-dot" />
            A NEW WORLD IS TAKING SHAPE
          </div>

          <p className="eyebrow">THINK BEYOND THE ORDINARY</p>

          <h1>
            Your next chapter.
            <br />
            <span>Without limits.</span>
          </h1>

          <p className="hero-description">
            A new digital experience is taking shape. A space built around
            ideas, possibilities, and the problems worth solving.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                document.getElementById("vision")?.scrollIntoView({
                  behavior: "smooth",
                })
              }
            >
              Explore the Vision <span>↗</span>
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                document.getElementById("vision")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              Discover the Unknown <span>⌁</span>
            </button>
          </div>

          <div className="hero-note">
            <span className="note-icon">✳</span>
            Built for people who think differently.
          </div>
        </div>

        <div className="visual-stage" aria-label="Abstract portal artwork">
          <div className="orbit orbit-outer" />
          <div className="orbit orbit-middle" />
          <div className="orbit orbit-inner" />

          <div className="portal-core">
            <div className="core-ring" />
            <div className="core-symbol">✳</div>
          </div>

          <span className="floating-label label-top">UNKNOWN / 001</span>

          <span className="floating-label label-bottom">
            THE FUTURE IS UNWRITTEN
          </span>

          <span className="floating-dot dot-one" />
          <span className="floating-dot dot-two" />
          <span className="floating-dot dot-three" />
        </div>
      </section>

      <section className="vision-section" id="vision">
        <p className="eyebrow">THE FOUNDATION</p>

        <h2>
          Big ideas deserve
          <br />
          <span>real solutions.</span>
        </h2>

        <p className="feature-intro">
          A growing set of tools to help you plan, learn, and make steady
          progress.
        </p>

        <div className="feature-grid">

          {/* DASHBOARD */}
          <button
            type="button"
            className="feature-card feature-card-action"
            onClick={() => setActiveModule("dashboard")}
          >
            <span className="feature-number">00 / COMMAND CENTER</span>
            <div className="feature-icon">🎮</div>
            <h3>Player Dashboard.</h3>
            <p>
              Track your XP, study streaks, achievements, focus time,
              and overall learning progress.
            </p>
            <span className="feature-card-link">
              Enter Dashboard <b>↗</b>
            </span>
          </button>

          {/* FOCUS HUB */}
          <button
            type="button"
            className="feature-card feature-card-action"
            onClick={() => setActiveModule("focus")}
          >
            <span className="feature-number">04 / NOW AVAILABLE</span>
            <div className="feature-icon">⏱</div>
            <h3>Focus Hub.</h3>
            <p>
              Build focus sessions, set daily study goals, track your time,
              and improve your productivity.
            </p>
            <span className="feature-card-link">
              Open Focus Hub <b>↗</b>
            </span>
          </button>

          {/* WINTER ARC */}
          <button
            type="button"
            className="feature-card feature-card-action"
            onClick={() => setActiveModule("winter")}
          >
            <span className="feature-number">01 / NOW AVAILABLE</span>
            <div className="feature-icon">❄</div>
            <h3>Winter Arc.</h3>
            <p>
              Set daily goals, build consistency, track your streak, and earn
              XP.
            </p>
            <span className="feature-card-link">
              Open Winter Arc <b>↗</b>
            </span>
          </button>

          {/* NOTES */}
          <button
            type="button"
            className="feature-card feature-card-action"
            onClick={() => setActiveModule("notes")}
          >
            <span className="feature-number">02 / NOW AVAILABLE</span>
            <div className="feature-icon">▤</div>
            <h3>Notes.</h3>
            <p>
              Organise folders, upload chapter photos, extract text, and
              prepare revision material.
            </p>
            <span className="feature-card-link">
              Open Notes <b>↗</b>
            </span>
          </button>

          {/* SYLLABUS TRACKER */}
          <button
            type="button"
            className="feature-card feature-card-action"
            onClick={() => setActiveModule("syllabus")}
          >
            <span className="feature-number">03 / NOW AVAILABLE</span>
            <div className="feature-icon">▦</div>
            <h3>Syllabus Tracker.</h3>
            <p>
              Track subjects, chapters, completion, and your study progress.
            </p>
            <span className="feature-card-link">
              Open Syllabus Tracker <b>↗</b>
            </span>
          </button>

          {/* PROFILE */}
          <button
            type="button"
            className="feature-card feature-card-action"
            onClick={() => setActiveModule("profile")}
          >
            <span className="feature-number">05 / NOW AVAILABLE</span>
            <div className="feature-icon">◈</div>
            <h3>My Profile.</h3>
            <p>
              Personalise your identity, choose your theme, and manage your
              study preferences.
            </p>
            <span className="feature-card-link">
              Open Profile <b>↗</b>
            </span>
          </button>

        </div>
      </section>

      <section className="help-section" id="help">
        <p className="eyebrow">WE'RE HERE TO HELP</p>

        <h2>
          Need a little <span>help?</span>
        </h2>

        <p className="help-description">
          Have a question or need assistance? Support details will be available
          here.
        </p>

        <div className="help-contact-grid">
          <article className="help-contact-card">
            <span className="help-contact-icon">✉</span>
            <div>
              <span className="help-contact-label">EMAIL SUPPORT</span>
              <h3>Email address coming soon</h3>
            </div>
          </article>

          <article className="help-contact-card">
            <span className="help-contact-icon">⌕</span>
            <div>
              <span className="help-contact-label">PHONE SUPPORT</span>
              <h3>Contact number coming soon</h3>
            </div>
          </article>
        </div>
      </section>

      <footer className="footer" id="about">
        <span>PROJECT X © 2026</span>
        <span>BUILT FOR WHAT COMES NEXT.</span>
      </footer>

      {/* DASHBOARD PORTAL */}
      {activeModule === "dashboard" &&
        createPortal(
          <div className="module-overlay">
            <Dashboard onBack={() => setActiveModule(null)} />
          </div>,
          document.body
        )}

      {/* WINTER ARC PORTAL */}
      {activeModule === "winter" &&
        createPortal(
          <div className="module-overlay">
            <WinterArc onBack={() => setActiveModule(null)} />
          </div>,
          document.body
        )}

      {/* NOTES PORTAL */}
      {activeModule === "notes" &&
        createPortal(
          <div className="module-overlay">
            <Notes onBack={() => setActiveModule(null)} />
          </div>,
          document.body
        )}

      {/* SYLLABUS PORTAL */}
      {activeModule === "syllabus" &&
        createPortal(
          <div className="module-overlay">
            <SyllabusTracker onBack={() => setActiveModule(null)} />
          </div>,
          document.body
        )}

      {/* FOCUS HUB PORTAL */}
      {activeModule === "focus" &&
        createPortal(
          <div className="module-overlay">
            <FocusHub onBack={() => setActiveModule(null)} />
          </div>,
          document.body
        )}

      {/* PROFILE PORTAL */}
      {activeModule === "profile" &&
        createPortal(
          <div className="module-overlay">
            <Profile
              onBack={() => setActiveModule(null)}
              email={session?.user?.email || ""}
            />
          </div>,
          document.body
        )}

      {/* SHADOW REALM */}
      {showPortal && session ? (
        <ShadowDashboard user={session.user} onLogout={handleLogout} />
      ) : (
        showPortal && (
          <div
            className="portal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closePortal();
              }
            }}
          >
            <section
              className="portal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="portal-title"
            >
              <button
                type="button"
                className="close-button"
                onClick={closePortal}
                aria-label="Close portal"
              >
                ×
              </button>

              <div className="portal-emblem">◈</div>

              <p className="portal-eyebrow">RESTRICTED ACCESS</p>
              <h2 id="portal-title">Shadow Realm</h2>

              <p className="portal-subtitle">
                Beyond the visible. Within your own world.
              </p>

              {loadingSession ? (
                <p role="status">Checking your secure session...</p>
              ) : session ? (
                <div className="member-dashboard">
                  <div className="access-divider">
                    <span />
                    <span>IDENTITY VERIFIED</span>
                    <span />
                  </div>

                  <h3>Welcome to the Realm.</h3>

                  <p>
                    Signed in as <strong>{session.user.email}</strong>
                  </p>

                  <p className="portal-subtitle">
                    Your authenticated session is active.
                  </p>

                  <button
                    type="button"
                    className="primary-button login-button"
                    onClick={handleLogout}
                    disabled={loadingAuth}
                  >
                    {loadingAuth ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="access-divider">
                    <span />
                    <span>IDENTITY VERIFICATION</span>
                    <span />
                  </div>

                  <h3>{isSignup ? "Create your account" : "Member login"}</h3>

                  <p className="portal-subtitle">
                    {isSignup
                      ? "Create your identity to enter the Realm."
                      : "Sign in to access your member space."}
                  </p>

                  <form className="login-form" onSubmit={handleAuth}>
                    <label htmlFor="member-email">Email address</label>

                    <input
                      id="member-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        resetAuthMessages();
                      }}
                      required
                    />

                    <label htmlFor="member-password">Password</label>

                    <div className="password-field">
                      <input
                        id="member-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={
                          isSignup ? "new-password" : "current-password"
                        }
                        placeholder={
                          isSignup
                            ? "At least 8 characters"
                            : "Enter your password"
                        }
                        minLength={isSignup ? 8 : undefined}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          resetAuthMessages();
                        }}
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowPassword((visible) => !visible)
                        }
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>

                    {authError && (
                      <p className="auth-error" role="alert">
                        {authError}
                      </p>
                    )}

                    {authMessage && (
                      <p className="auth-message" role="status">
                        {authMessage}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="primary-button login-button"
                      disabled={loadingAuth}
                    >
                      {loadingAuth
                        ? "Please wait..."
                        : isSignup
                          ? "Create Account"
                          : "Enter the Shadow Realm"}
                      {!loadingAuth && <span> ↗</span>}
                    </button>
                  </form>

                  <p className="auth-switch">
                    {isSignup
                      ? "Already have an account?"
                      : "New to the Shadow Realm?"}{" "}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setIsSignup((previous) => !previous);
                        setPassword("");
                        resetAuthMessages();
                      }}
                    >
                      {isSignup ? "Sign in" : "Create account"}
                    </button>
                  </p>
                </>
              )}

              {authError && session && (
                <p className="auth-error" role="alert">
                  {authError}
                </p>
              )}

              {authMessage && session && (
                <p className="auth-message" role="status">
                  {authMessage}
                </p>
              )}
            </section>
          </div>
        )
      )}
    </main>
  );
}