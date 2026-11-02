import { useEffect, useRef, useState } from "react";
import "./DashboardGamification.css";

export default function DashboardGamification({ stats }) {
  const [xpPopup, setXpPopup] = useState(null);
  const [levelUp, setLevelUp] = useState(false);

  const previousXP = useRef(stats.totalXP);
  const previousLevel = useRef(stats.level);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    if (stats.totalXP > previousXP.current) {
      const gained = stats.totalXP - previousXP.current;

      setXpPopup(gained);

      const timer = setTimeout(() => {
        setXpPopup(null);
      }, 2500);

      return () => clearTimeout(timer);
    }

    previousXP.current = stats.totalXP;
  }, [stats.totalXP]);

  useEffect(() => {
    if (stats.level > previousLevel.current) {
      setLevelUp(true);

      const timer = setTimeout(() => {
        setLevelUp(false);
      }, 3500);

      previousLevel.current = stats.level;

      return () => clearTimeout(timer);
    }

    previousLevel.current = stats.level;
  }, [stats.level]);

  const missions = [
    {
      icon: "⏱️",
      title: "Enter Focus Mode",
      description: "Complete 1 focus session today",
      progress: Math.min(stats.todaySessions, 1),
      target: 1,
    },
    {
      icon: "🔥",
      title: "Deep Work",
      description: "Study for 25 minutes today",
      progress: Math.min(stats.todayMinutes, 25),
      target: 25,
    },
    {
      icon: "🎯",
      title: "Goal Crusher",
      description: "Complete 1 daily goal",
      progress: Math.min(stats.completedGoals, 1),
      target: 1,
    },
  ];

  const secrets = [
    {
      icon: "🕵️",
      title: "Silent Grinder",
      description: "Complete 10 focus sessions",
      unlocked: stats.totalSessions >= 10,
    },
    {
      icon: "❄️",
      title: "Winter Master",
      description: "Complete 20 Winter Arc missions",
      unlocked: stats.completedTasks >= 20,
    },
    {
      icon: "📖",
      title: "Bookworm",
      description: "Complete 25 chapters",
      unlocked: stats.completedChapters >= 25,
    },
    {
      icon: "👑",
      title: "Beyond Limits",
      description: "Reach Level 10",
      unlocked: stats.level >= 10,
    },
  ];

  return (
    <section className="px-gamification">

      {xpPopup !== null && (
        <div className="px-xp-popup">
          ⚡ +{xpPopup} XP EARNED!
        </div>
      )}

      {levelUp && (
        <div className="px-level-overlay">
          <div className="px-level-animation">
            <span>🏆</span>
            <p>LEVEL UP!</p>
            <strong>LEVEL {stats.level}</strong>
            <small>YOUR POWER IS GROWING</small>
          </div>
        </div>
      )}

      <div className="px-panel px-missions-panel">
        <div className="px-panel-heading">
          <div>
            <span className="px-label">DAILY CHALLENGES</span>
            <h2>Daily Missions</h2>
          </div>
          <span className="px-panel-icon">🎯</span>
        </div>

        <div className="px-mission-list">
          {missions.map((mission) => {
            const completed = mission.progress >= mission.target;

            return (
              <article
                className={`px-mission-card ${
                  completed ? "completed" : ""
                }`}
                key={mission.title}
              >
                <span className="px-mission-icon">{mission.icon}</span>

                <div className="px-mission-info">
                  <strong>{mission.title}</strong>
                  <small>{mission.description}</small>

                  <div className="px-mission-track">
                    <div
                      style={{
                        width: `${
                          (mission.progress / mission.target) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <span className="px-mission-status">
                  {completed
                    ? "✓ DONE"
                    : `${mission.progress}/${mission.target}`}
                </span>
              </article>
            );
          })}
        </div>
      </div>

      <div className="px-panel px-secret-panel">
        <div className="px-panel-heading">
          <div>
            <span className="px-label">CLASSIFIED / RESTRICTED</span>
            <h2>Secret Achievements</h2>
          </div>
          <span className="px-panel-icon">🔐</span>
        </div>

        <button
          className="px-secret-toggle"
          onClick={() => setShowSecrets((value) => !value)}
        >
          {showSecrets ? "HIDE SECRETS" : "REVEAL SECRET ACHIEVEMENTS"}
          <span>{showSecrets ? "▲" : "▼"}</span>
        </button>

        {showSecrets && (
          <div className="px-secret-grid">
            {secrets.map((secret) => (
              <article
                className={`px-secret-card ${
                  secret.unlocked ? "unlocked" : "locked"
                }`}
                key={secret.title}
              >
                <span>{secret.unlocked ? secret.icon : "🔒"}</span>
                <strong>
                  {secret.unlocked ? secret.title : "???"}
                </strong>
                <small>{secret.description}</small>
                <b>
                  {secret.unlocked ? "UNLOCKED" : "UNDISCOVERED"}
                </b>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}