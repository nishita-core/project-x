import { useEffect, useState } from "react";
import "./Profile.css";

const STORAGE_KEY = "project-x-profile-v1";

const DEFAULT_PROFILE = {
  name: "Project X User",
  username: "px_user",
  bio: "Building better habits. One day at a time.",
  theme: "cyber",
  notifications: {
    studyReminders: true,
    dailyGoals: true,
    weeklySummary: false,
  },
};

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (saved && typeof saved === "object") {
      return {
        ...DEFAULT_PROFILE,
        ...saved,
        notifications: {
          ...DEFAULT_PROFILE.notifications,
          ...(saved.notifications || {}),
        },
      };
    }
  } catch (error) {
    console.warn("Profile could not be loaded:", error);
  }

  return DEFAULT_PROFILE;
}

export default function Profile({ onBack, email = "" }) {
  const [profile, setProfile] = useState(loadProfile);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  const initials = profile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "PX";

  function updateProfile(key, value) {
    setProfile((old) => ({ ...old, [key]: value }));
    setSavedMessage("");
  }

  function toggleNotification(key) {
    setProfile((old) => ({
      ...old,
      notifications: {
        ...old.notifications,
        [key]: !old.notifications[key],
      },
    }));

    setSavedMessage("");
  }

  function saveProfile(event) {
    event.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setSavedMessage("PROFILE UPDATED SUCCESSFULLY ✓");
  }

  return (
    <main className="px-profile-page">
      <div className="px-profile-glow px-glow-one" />
      <div className="px-profile-glow px-glow-two" />

      <header className="px-profile-header">
        <div>
          <button
            type="button"
            className="px-back-button"
            onClick={onBack}
          >
            ← BACK TO PROJECT X
          </button>

          <p className="px-profile-kicker">PROJECT X / IDENTITY SYSTEM</p>
          <h1>My <span>Profile.</span></h1>
          <p className="px-profile-subtitle">
            Your space. Your preferences. Your experience.
          </p>
        </div>

        <div className="px-system-status">
          <span />
          SYSTEM ONLINE
        </div>
      </header>

      <section className="px-profile-layout">

        <aside className="px-identity-card">
          <div className="px-card-topline">
            <span>USER IDENTITY</span>
            <span>01 / 04</span>
          </div>

          <div className="px-avatar">
            <span>{initials}</span>
            <div className="px-avatar-status" />
          </div>

          <h2>{profile.name || "Your Name"}</h2>
          <p className="px-username">@{profile.username || "username"}</p>

          <div className="px-identity-divider" />

          <p className="px-bio">
            {profile.bio || "No bio added yet."}
          </p>

          <div className="px-identity-tags">
            <span>✦ PROJECT X MEMBER</span>
            <span>◈ PERSONAL SPACE</span>
          </div>

          <div className="px-identity-footer">
            <span>ACCOUNT STATUS</span>
            <strong>● ACTIVE</strong>
          </div>
        </aside>

        <div className="px-profile-main">

          <form className="px-panel" onSubmit={saveProfile}>
            <div className="px-panel-heading">
              <div>
                <span className="px-panel-kicker">PERSONAL INFORMATION</span>
                <h2>Identity Settings</h2>
              </div>
              <span className="px-panel-icon">◈</span>
            </div>

            <div className="px-form-grid">
              <label>
                Display Name
                <input
                  type="text"
                  value={profile.name}
                  maxLength={35}
                  onChange={(event) =>
                    updateProfile("name", event.target.value)
                  }
                  placeholder="Enter your name"
                />
              </label>

              <label>
                Username
                <input
                  type="text"
                  value={profile.username}
                  maxLength={20}
                  onChange={(event) =>
                    updateProfile(
                      "username",
                      event.target.value.replace(/[^a-zA-Z0-9_]/g, "")
                    )
                  }
                  placeholder="Choose a username"
                />
              </label>
            </div>

            <label className="px-bio-label">
              About You
              <textarea
                value={profile.bio}
                maxLength={120}
                rows={3}
                onChange={(event) =>
                  updateProfile("bio", event.target.value)
                }
                placeholder="Write something about yourself..."
              />
              <small>{profile.bio.length}/120 characters</small>
            </label>

            {email && (
              <div className="px-email-display">
                <span>CONNECTED ACCOUNT</span>
                <strong>{email}</strong>
              </div>
            )}

            <button className="px-save-button" type="submit">
              SAVE PROFILE <span>↗</span>
            </button>

            {savedMessage && (
              <p className="px-saved-message" role="status">
                {savedMessage}
              </p>
            )}
          </form>

          <section className="px-panel">
            <div className="px-panel-heading">
              <div>
                <span className="px-panel-kicker">VISUAL EXPERIENCE</span>
                <h2>Appearance</h2>
              </div>
              <span className="px-panel-icon">◉</span>
            </div>

            <p className="px-panel-description">
              Choose your preferred visual style.
            </p>

            <div className="px-theme-options">
              <button
                type="button"
                className={`px-theme-option px-theme-cyber ${
                  profile.theme === "cyber" ? "selected" : ""
                }`}
                onClick={() => updateProfile("theme", "cyber")}
              >
                <span className="px-theme-preview" />
                <strong>Cyber Purple</strong>
                <small>Neon / Futuristic</small>
                {profile.theme === "cyber" && <b>✓ SELECTED</b>}
              </button>

              <button
                type="button"
                className={`px-theme-option px-theme-midnight ${
                  profile.theme === "midnight" ? "selected" : ""
                }`}
                onClick={() => updateProfile("theme", "midnight")}
              >
                <span className="px-theme-preview" />
                <strong>Midnight Blue</strong>
                <small>Cool / Minimal</small>
                {profile.theme === "midnight" && <b>✓ SELECTED</b>}
              </button>

              <button
                type="button"
                className={`px-theme-option px-theme-emerald ${
                  profile.theme === "emerald" ? "selected" : ""
                }`}
                onClick={() => updateProfile("theme", "emerald")}
              >
                <span className="px-theme-preview" />
                <strong>Emerald</strong>
                <small>Fresh / Modern</small>
                {profile.theme === "emerald" && <b>✓ SELECTED</b>}
              </button>
            </div>
          </section>

          <section className="px-panel">
            <div className="px-panel-heading">
              <div>
                <span className="px-panel-kicker">STAY INFORMED</span>
                <h2>Notifications</h2>
              </div>
              <span className="px-panel-icon">⌁</span>
            </div>

            <div className="px-notification-list">
              <div className="px-notification-row">
                <div>
                  <strong>Study Reminders</strong>
                  <p>Keep track of your planned study time.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.notifications.studyReminders}
                  className={`px-toggle ${
                    profile.notifications.studyReminders ? "on" : ""
                  }`}
                  onClick={() => toggleNotification("studyReminders")}
                >
                  <span />
                </button>
              </div>

              <div className="px-notification-row">
                <div>
                  <strong>Daily Goals</strong>
                  <p>Stay aware of your daily targets.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.notifications.dailyGoals}
                  className={`px-toggle ${
                    profile.notifications.dailyGoals ? "on" : ""
                  }`}
                  onClick={() => toggleNotification("dailyGoals")}
                >
                  <span />
                </button>
              </div>

              <div className="px-notification-row">
                <div>
                  <strong>Weekly Summary</strong>
                  <p>Review your progress at the end of the week.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.notifications.weeklySummary}
                  className={`px-toggle ${
                    profile.notifications.weeklySummary ? "on" : ""
                  }`}
                  onClick={() => toggleNotification("weeklySummary")}
                >
                  <span />
                </button>
              </div>
            </div>

            <p className="px-local-storage-note">
              🔒 Preferences are saved locally on this device.
            </p>
          </section>

        </div>
      </section>

      <footer className="px-profile-footer">
        PROJECT X <span>•</span> PROFILE SYSTEM 2.0
        <span>•</span> YOUR SPACE, YOUR RULES
      </footer>
    </main>
  );
}