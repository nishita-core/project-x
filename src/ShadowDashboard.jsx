import { useState } from "react";
import "./ShadowDashboard.css";
import Community from "./Community";
import ShadowProfile from "./ShadowProfile";
import PrivateChat from "./PrivateChat";

export default function ShadowDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const navigation = [
    { name: "Overview", icon: "◈" },
    { name: "Private Chat", icon: "◉" },
    { name: "Community", icon: "◇" },
    { name: "Members", icon: "◎" },
    { name: "My Profile", icon: "✧" },
    { name: "Settings", icon: "⚙" },
  ];

  async function handleLogoutClick() {
    setLoggingOut(true);
    setLogoutError("");

    try {
      await onLogout();
    } catch {
      setLogoutError("Logout failed. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="shadow-dashboard">
      <aside className="shadow-sidebar">
        <div className="shadow-brand">
          <span className="shadow-brand-icon">◈</span>
          <div>
            <strong>SHADOW REALM</strong>
            <small>PROJECT X / PRIVATE SPACE</small>
          </div>
        </div>

        <div className="shadow-profile">
          <div className="shadow-avatar">
            {(user.email || "M").charAt(0).toUpperCase()}
          </div>

          <div className="shadow-profile-info">
            <strong>Realm Member</strong>
            <span>Verified account</span>
          </div>

          <span className="shadow-online-dot" />
        </div>

        <p className="shadow-nav-label">WORKSPACE</p>

        <nav className="shadow-nav">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.name}
              className={
                activeTab === item.name
                  ? "shadow-nav-item active"
                  : "shadow-nav-item"
              }
              onClick={() => setActiveTab(item.name)}
            >
              <span className="shadow-nav-icon">{item.icon}</span>
              <span>{item.name}</span>

              {item.name === "Private Chat" && (
                <span className="shadow-nav-badge">NEW</span>
              )}
            </button>
          ))}
        </nav>

        <div className="shadow-sidebar-bottom">
          <div className="shadow-secure-card">
            <span>◈</span>
            <strong>Private space</strong>
            <p>Your authenticated session is active.</p>
          </div>

          {logoutError && (
            <p className="shadow-error" role="alert">
              {logoutError}
            </p>
          )}

          <button
            type="button"
            className="shadow-logout"
            onClick={handleLogoutClick}
            disabled={loggingOut}
          >
            <span>↗</span>
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <main className="shadow-main">
        <header className="shadow-topbar">
          <div className="shadow-breadcrumb">
            PROJECT X <span>/</span> SHADOW REALM <span>/</span>{" "}
            {activeTab.toUpperCase()}
          </div>

          <div className="shadow-topbar-right">
            <span className="shadow-live">
              <span /> SYSTEM ONLINE
            </span>

            <div className="shadow-mini-avatar">
              {(user.email || "M").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <section className="shadow-content">
          {activeTab === "Overview" && (
            <>
              <div className="shadow-welcome">
                <div>
                  <p className="shadow-eyebrow">
                    ◈ IDENTITY VERIFIED
                  </p>

                  <h1>
                    Welcome to the
                    <br />
                    <span>unknown.</span>
                  </h1>

                  <p className="shadow-description">
                    Your space. Your ideas. Your next chapter starts here.
                  </p>
                </div>

                <div className="shadow-orb">
                  <div className="shadow-orb-ring">
                    <span>✳</span>
                  </div>
                </div>
              </div>

              <div className="shadow-section-heading">
                <div>
                  <p className="shadow-eyebrow">YOUR SPACE</p>
                  <h2>Inside the Realm</h2>
                </div>

                <span className="shadow-private-tag">
                  ◈ PRIVATE WORKSPACE
                </span>
              </div>

              <div className="shadow-feature-grid">
                <button
                  type="button"
                  className="shadow-feature-card"
                  onClick={() => setActiveTab("Private Chat")}
                >
                  <span className="shadow-card-icon">◉</span>
                  <span className="shadow-card-number">01 / CONNECT</span>
                  <strong>Private Chat</strong>
                  <p>
                    A dedicated space for conversations between members.
                  </p>
                  <span className="shadow-card-link">
                    Open workspace ↗
                  </span>
                </button>

                <button
                  type="button"
                  className="shadow-feature-card"
                  onClick={() => setActiveTab("Community")}
                >
                  <span className="shadow-card-icon">◇</span>
                  <span className="shadow-card-number">02 / DISCOVER</span>
                  <strong>Community</strong>
                  <p>
                    Share ideas, explore discussions, and build together.
                  </p>
                  <span className="shadow-card-link">
                    Explore community ↗
                  </span>
                </button>

                <button
                  type="button"
                  className="shadow-feature-card"
                  onClick={() => setActiveTab("Members")}
                >
                  <span className="shadow-card-icon">◎</span>
                  <span className="shadow-card-number">03 / PEOPLE</span>
                  <strong>Members</strong>
                  <p>
                    Your gateway to the people inside Project X.
                  </p>
                  <span className="shadow-card-link">
                    View members ↗
                  </span>
                </button>
              </div>

              <div className="shadow-bottom-panel">
                <div className="shadow-bottom-symbol">✳</div>
                <div>
                  <p className="shadow-eyebrow">THE NEXT CHAPTER</p>
                  <h3>Ideas are only the beginning.</h3>
                  <p>
                    A private space designed for meaningful collaboration.
                  </p>
                </div>
                <span className="shadow-bottom-decoration">PX / 001</span>
              </div>
            </>
          )}

          {activeTab === "Private Chat" && (
            <PrivateChat user={user} />
          )}

          {activeTab === "Community" && (
            <Community user={user} />
          )}

          {activeTab === "Members" && (
            <section className="shadow-placeholder">
              <span className="shadow-placeholder-icon">◎</span>
              <p className="shadow-eyebrow">PEOPLE / 003</p>
              <h1>
                Meet the <span>members.</span>
              </h1>
              <p>
                The member directory will be connected after we set up
                access-controlled member profiles.
              </p>
              <div className="shadow-coming-soon">
                <span /> MEMBER DIRECTORY NOT CONFIGURED
              </div>
            </section>
          )}

          {activeTab === "My Profile" && (
            <ShadowProfile
              user={user}
              onClose={() => setActiveTab("Overview")}
            />
          )}

          {activeTab === "Settings" && (
            <section className="shadow-settings">
              <p className="shadow-eyebrow">ACCOUNT / 004</p>
              <h1>
                Your <span>identity.</span>
              </h1>

              <div className="shadow-settings-card">
                <div className="shadow-settings-avatar">
                  {(user.email || "M").charAt(0).toUpperCase()}
                </div>

                <div>
                  <span>AUTHENTICATED ACCOUNT</span>
                  <strong>{user.email}</strong>
                  <p>Account ID: {user.id}</p>
                </div>
              </div>

              <p className="shadow-settings-note">
                Account details are supplied by your authenticated
                Supabase session.
              </p>
            </section>
          )}
        </section>

        <footer className="shadow-footer">
          <span>PROJECT X © 2026</span>
          <span>BEYOND THE VISIBLE. WITHIN YOUR OWN WORLD.</span>
        </footer>
      </main>
    </div>
  );
}