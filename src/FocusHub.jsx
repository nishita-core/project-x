import { useEffect, useMemo, useRef, useState } from "react";
import "./FocusHub.css";

const STORAGE_KEY = "project-x-focus-hub-v1";

const DEFAULT_DATA = {
  goals: [],
  sessions: [],
  settings: { focusMinutes: 25, shortBreak: 5, longBreak: 15 },
};

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      return {
        goals: Array.isArray(saved.goals) ? saved.goals : [],
        sessions: Array.isArray(saved.sessions) ? saved.sessions : [],
        settings: { ...DEFAULT_DATA.settings, ...(saved.settings || {}) },
      };
    }
  } catch (error) {
    console.warn("Focus Hub data could not be loaded:", error);
  }
  return DEFAULT_DATA;
}

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function FocusHub( {onBack} ) {
  const [data, setData] = useState(loadData);
  const [mode, setMode] = useState("focus");
  const [remaining, setRemaining] = useState(loadData().settings.focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const [goalText, setGoalText] = useState("");
  const [goalMinutes, setGoalMinutes] = useState("30");
  const [notice, setNotice] = useState("");
  const endTimeRef = useRef(null);

  const durations = {
    focus: Number(data.settings.focusMinutes) * 60,
    short: Number(data.settings.shortBreak) * 60,
    long: Number(data.settings.longBreak) * 60,
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (!running) return undefined;
    endTimeRef.current = Date.now() + remaining * 1000;
    const interval = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setRemaining(next);
      if (next <= 0) {
        window.clearInterval(interval);
        setRunning(false);
        if (mode === "focus") {
          setData((old) => ({
            ...old,
            sessions: [
              ...old.sessions,
              { id: `${Date.now()}`, date: dateKey(), minutes: Number(old.settings.focusMinutes), type: "focus" },
            ],
          }));
          setNotice("Focus session complete! Great work. Take a short break. 🎉");
        } else {
          setNotice("Break finished. Ready for another session? ✨");
        }
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [running, mode]); // remaining is tracked against an absolute end time

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const today = dateKey();
  const todaySessions = data.sessions.filter((session) => session.date === today && session.type === "focus");
  const todayMinutes = todaySessions.reduce((sum, session) => sum + Number(session.minutes || 0), 0);
  const todayGoals = data.goals.filter((goal) => goal.date === today);
  const completedGoals = todayGoals.filter((goal) => goal.done).length;
  const weeklyMinutes = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return data.sessions
      .filter((session) => session.type === "focus" && new Date(`${session.date}T00:00:00`) >= start)
      .reduce((sum, session) => sum + Number(session.minutes || 0), 0);
  }, [data.sessions]);

  function chooseMode(nextMode) {
    setRunning(false);
    setMode(nextMode);
    setRemaining(durations[nextMode]);
    setNotice("");
  }

  function startPause() {
    if (remaining <= 0) setRemaining(durations[mode]);
    setRunning((value) => !value);
  }

  function resetTimer() {
    setRunning(false);
    setRemaining(durations[mode]);
  }

  function addGoal(event) {
    event.preventDefault();
    const title = goalText.trim();
    if (!title) return;
    setData((old) => ({
      ...old,
      goals: [...old.goals, {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        targetMinutes: Math.max(5, Number(goalMinutes) || 30),
        done: false,
        date: today,
      }],
    }));
    setGoalText("");
    setNotice("Daily goal added. You’ve got this! 💪");
  }

  function toggleGoal(id) {
    setData((old) => ({
      ...old,
      goals: old.goals.map((goal) => goal.id === id ? { ...goal, done: !goal.done } : goal),
    }));
  }

  function deleteGoal(id) {
    setData((old) => ({ ...old, goals: old.goals.filter((goal) => goal.id !== id) }));
  }

  function updateSetting(key, value) {
    const number = Math.min(180, Math.max(1, Number(value) || 1));
    setData((old) => ({ ...old, settings: { ...old.settings, [key]: number } }));
    setRunning(false);
    setRemaining(number * 60);
  }

  const progress = durations[mode] > 0 ? ((durations[mode] - remaining) / durations[mode]) * 100 : 0;
  const modeLabels = { focus: "Focus Session", short: "Short Break", long: "Long Break" };

  return (
    <main className="focus-hub">
     <header className="fh-header">
  <div>
    {onBack && (
      <button
        type="button"
        className="fh-back-button"
        onClick={onBack}
      >
        ← Back to Project X
      </button>
    )}

    <p className="fh-eyebrow">PROJECT X / PRODUCTIVITY</p>
          <h1>Focus <span>Hub</span></h1>
          <p className="fh-subtitle">A little focus today. A lot of progress tomorrow.</p>
        </div>
        <div className="fh-date-card">
          <span>📅 TODAY</span>
          <strong>{new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</strong>
        </div>
      </header>

      {notice && <div className="fh-notice" role="status">{notice}</div>}

      <section className="fh-top-grid">
        <article className="fh-card fh-timer-card">
          <div className="fh-card-heading">
            <div><span className="fh-kicker">YOUR DEEP WORK SPACE</span><h2>{modeLabels[mode]}</h2></div>
            <span className="fh-live-dot">{running ? "● LIVE" : "○ READY"}</span>
          </div>

          <div className="fh-mode-tabs">
            <button className={mode === "focus" ? "active" : ""} onClick={() => chooseMode("focus")}>Focus</button>
            <button className={mode === "short" ? "active" : ""} onClick={() => chooseMode("short")}>Short break</button>
            <button className={mode === "long" ? "active" : ""} onClick={() => chooseMode("long")}>Long break</button>
          </div>

          <div className="fh-timer-wrap">
            <div className="fh-timer-ring" style={{ "--timer-progress": `${progress}%` }}>
              <div className="fh-timer-inner">
                <span>{mode === "focus" ? "STAY IN THE ZONE" : "TAKE A BREATHER"}</span>
                <strong>{formatTime(remaining)}</strong>
                <small>{running ? "Keep going…" : "One step at a time"}</small>
              </div>
            </div>
          </div>

          <div className="fh-timer-actions">
            <button className="fh-primary-btn" onClick={startPause}>{running ? "Ⅱ  Pause" : "▶  Start focus"}</button>
            <button className="fh-ghost-btn" onClick={resetTimer}>↻ Reset</button>
          </div>
          <p className="fh-timer-tip">Tip: put distractions away and focus on just one task.</p>
        </article>

        <article className="fh-card fh-stats-card">
          <span className="fh-kicker">YOUR PROGRESS</span>
          <h2>Today at a glance</h2>
          <div className="fh-stat-grid">
            <div className="fh-stat"><span>⏱️</span><strong>{todayMinutes}</strong><small>Focus minutes</small></div>
            <div className="fh-stat"><span>🎯</span><strong>{completedGoals}/{todayGoals.length}</strong><small>Goals completed</small></div>
            <div className="fh-stat"><span>🍅</span><strong>{todaySessions.length}</strong><small>Focus sessions</small></div>
            <div className="fh-stat"><span>📈</span><strong>{weeklyMinutes}</strong><small>Minutes this week</small></div>
          </div>
          <div className="fh-quote">
            <span>✦</span>
            <p>“You don’t have to be perfect. You just have to begin.”</p>
          </div>
        </article>
      </section>

      <section className="fh-bottom-grid">
        <article className="fh-card fh-goals-card">
          <div className="fh-section-title">
            <div><span className="fh-kicker">MAKE TODAY COUNT</span><h2>Daily goals</h2></div>
            <span className="fh-count-pill">{completedGoals}/{todayGoals.length} done</span>
          </div>
          <form className="fh-goal-form" onSubmit={addGoal}>
            <input value={goalText} onChange={(event) => setGoalText(event.target.value)} placeholder="e.g. Revise Science chapter 2" maxLength={90} aria-label="New daily goal" />
            <select value={goalMinutes} onChange={(event) => setGoalMinutes(event.target.value)} aria-label="Goal time estimate">
              <option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hour</option><option value="90">1.5 hours</option>
            </select>
            <button type="submit">＋ Add</button>
          </form>
          {todayGoals.length === 0 ? (
            <div className="fh-empty"><span>✦</span><strong>Your day, your goals.</strong><p>Add a small target above and start building momentum.</p></div>
          ) : (
            <div className="fh-goal-list">
              {todayGoals.map((goal) => (
                <div className={`fh-goal-item ${goal.done ? "is-done" : ""}`} key={goal.id}>
                  <button className="fh-check" onClick={() => toggleGoal(goal.id)} aria-label={goal.done ? "Mark goal incomplete" : "Complete goal"}>{goal.done ? "✓" : ""}</button>
                  <div className="fh-goal-copy"><strong>{goal.title}</strong><small>◷ {goal.targetMinutes} min target</small></div>
                  <button className="fh-delete" onClick={() => deleteGoal(goal.id)} aria-label="Delete goal">×</button>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="fh-card fh-settings-card">
          <span className="fh-kicker">MAKE IT YOURS</span>
          <h2>Timer settings</h2>
          <p className="fh-settings-note">Choose durations that work for your study rhythm.</p>
          <div className="fh-setting-row"><label htmlFor="fh-focus">Focus duration</label><div><input id="fh-focus" type="number" min="1" max="180" value={data.settings.focusMinutes} onChange={(e) => updateSetting("focusMinutes", e.target.value)} /><span>min</span></div></div>
          <div className="fh-setting-row"><label htmlFor="fh-short">Short break</label><div><input id="fh-short" type="number" min="1" max="180" value={data.settings.shortBreak} onChange={(e) => updateSetting("shortBreak", e.target.value)} /><span>min</span></div></div>
          <div className="fh-setting-row"><label htmlFor="fh-long">Long break</label><div><input id="fh-long" type="number" min="1" max="180" value={data.settings.longBreak} onChange={(e) => updateSetting("longBreak", e.target.value)} /><span>min</span></div></div>
          <div className="fh-local-note">🔒 Your goals and study stats are saved on this device.</div>
        </article>
      </section>
      <footer className="fh-footer">PROJECT X <span>•</span> FOCUS HUB 1.0 <span>•</span> BUILT FOR BETTER STUDY DAYS</footer>
    </main>
  );
}
