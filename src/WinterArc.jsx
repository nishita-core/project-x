import { useEffect, useMemo, useState } from "react";
import "./WinterArc.css";

const STORAGE_KEY = "project-x-winter-arc-v1";

export default function WinterArc({ onBack }) {
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).tasks || [] : [];
    } catch {
      return [];
    }
  });
  const [taskText, setTaskText] = useState("");
  const [activeTab, setActiveTab] = useState("Today");

  useEffect(() => {
    try {
      const old = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...old, tasks }));
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks }));
    }
  }, [tasks]);

  const completed = tasks.filter((task) => task.done).length;
  const total = tasks.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const xp = completed * 10;
  const level = Math.floor(xp / 100) + 1;
  const levelProgress = xp % 100;

  const visibleTasks = useMemo(() => {
    if (activeTab === "Completed") return tasks.filter((task) => task.done);
    if (activeTab === "Pending") return tasks.filter((task) => !task.done);
    return tasks;
  }, [tasks, activeTab]);

  function addTask(event) {
    event.preventDefault();
    const title = taskText.trim();
    if (!title) return;
    setTasks((current) => [
      ...current,
      { id: `${Date.now()}-${Math.random()}`, title, done: false, createdAt: new Date().toISOString() },
    ]);
    setTaskText("");
  }

  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
    );
  }

  function deleteTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  return (
    <main className="winter-page">
      <div className="winter-shell">
        <header className="winter-topbar">
          <button className="winter-back" onClick={onBack || (() => window.history.back())}>
            ← Back
          </button>
          <span className="winter-brand">PROJECT X <i> / WINTER ARC</i></span>
          <span className="winter-status"><span /> YOUR RESET SEASON</span>
        </header>

        <section className="winter-hero">
          <div>
            <p className="winter-eyebrow">DISCIPLINE • CONSISTENCY • GROWTH</p>
            <h1>Build your <span>Winter Arc.</span></h1>
            <p className="winter-subtitle">
              Small actions. Every day. A stronger version of you.
            </p>
          </div>
          <div className="winter-snowflake" aria-hidden="true">❄</div>
        </section>

        <section className="winter-stats">
          <article className="winter-stat-card">
            <span className="winter-stat-label">TOTAL XP</span>
            <strong>{xp}<small> XP</small></strong>
            <p>Earn 10 XP for every completed task.</p>
          </article>
          <article className="winter-stat-card">
            <span className="winter-stat-label">CURRENT LEVEL</span>
            <strong>LEVEL {level}</strong>
            <div className="winter-level-track"><span style={{ width: `${levelProgress}%` }} /></div>
            <p>{100 - levelProgress} XP to the next level.</p>
          </article>
          <article className="winter-stat-card">
            <span className="winter-stat-label">TASK PROGRESS</span>
            <strong>{progress}<small>%</small></strong>
            <div className="winter-level-track"><span style={{ width: `${progress}%` }} /></div>
            <p>{completed} of {total} tasks completed.</p>
          </article>
        </section>

        <section className="winter-workspace">
          <div className="winter-section-heading">
            <div>
              <p className="winter-eyebrow">YOUR DAILY SYSTEM</p>
              <h2>Today's missions</h2>
            </div>
            <span className="winter-date">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</span>
          </div>

          <form className="winter-add-form" onSubmit={addTask}>
            <input
              value={taskText}
              onChange={(event) => setTaskText(event.target.value)}
              placeholder="Add a goal or task for today..."
              aria-label="New task"
              maxLength={100}
            />
            <button type="submit">+ Add task</button>
          </form>

          <div className="winter-tabs" role="tablist" aria-label="Task filters">
            {["Today", "Pending", "Completed"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? "active" : ""}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="winter-task-list">
            {visibleTasks.length ? visibleTasks.map((task) => (
              <article className={`winter-task ${task.done ? "is-done" : ""}`} key={task.id}>
                <button
                  className="winter-check"
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  aria-label={task.done ? "Mark as pending" : "Mark as completed"}
                >
                  {task.done ? "✓" : ""}
                </button>
                <span className="winter-task-title">{task.title}</span>
                <span className="winter-task-xp">{task.done ? "+10 XP earned" : "+10 XP"}</span>
                <button className="winter-delete" type="button" onClick={() => deleteTask(task.id)} aria-label="Delete task">×</button>
              </article>
            )) : (
              <div className="winter-empty">
                <span>✦</span>
                <strong>{activeTab === "Completed" ? "No completed tasks yet" : activeTab === "Pending" ? "You're all caught up!" : "Your mission list is clear"}</strong>
                <p>Add your first task above and start building momentum.</p>
              </div>
            )}
          </div>
        </section>

        <footer className="winter-footer">
          <span>SHOW UP FOR YOURSELF.</span>
          <span>PROJECT X <b>✦</b> WINTER ARC</span>
        </footer>
      </div>
    </main>
  );
}
