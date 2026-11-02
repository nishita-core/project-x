import { useEffect, useMemo, useState } from "react";
import "./Dashboard.css";
import DashboardGamification from "./DashboardGamification";

const STORAGE_KEYS = {
  focus: "project-x-focus-hub-v1",
  winter: "project-x-winter-arc-v1",
  syllabus: "project-x-syllabus-v1",
  analytics: "project-x-study-analytics",
  exam: "project-x-exam-date",
};

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDate(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function getStreak(dates) {
  const activeDays = new Set(dates);
  let current = new Date();

  if (!activeDays.has(dateKey(current))) {
    current = shiftDate(current, -1);
    if (!activeDays.has(dateKey(current))) return 0;
  }

  let streak = 0;

  while (activeDays.has(dateKey(current))) {
    streak++;
    current = shiftDate(current, -1);
  }

  return streak;
}

function getInitialData() {
  const focus = readStorage(STORAGE_KEYS.focus, {});
  const winter = readStorage(STORAGE_KEYS.winter, {});
  const subjects = safeArray(readStorage(STORAGE_KEYS.syllabus, []));
  const analytics = readStorage(STORAGE_KEYS.analytics, {
    activityDates: [],
    completionEvents: [],
  });

  const sessions = safeArray(focus.sessions);
  const goals = safeArray(focus.goals);
  const tasks = safeArray(winter.tasks);
  const completionEvents = safeArray(analytics.completionEvents);

  const chapters = subjects.flatMap((subject) =>
    safeArray(subject.chapters).map((chapter) => ({
      ...chapter,
      subjectName: subject.name || "Other",
    }))
  );

  const completedChapters = chapters.filter(
    (chapter) => chapter.status === "completed"
  ).length;

  const focusSessions = sessions.filter(
    (session) => session.type === "focus"
  );

  const completedTasks = tasks.filter((task) => task.done).length;

  const totalFocusMinutes = focusSessions.reduce(
    (sum, session) => sum + Math.max(0, Number(session.minutes) || 0),
    0
  );

  const today = dateKey();

  const todaySessions = focusSessions.filter(
    (session) => session.date === today
  );

  const todayMinutes = todaySessions.reduce(
    (sum, session) => sum + Math.max(0, Number(session.minutes) || 0),
    0
  );

  const todayGoals = goals.filter((goal) => goal.date === today);
  const completedGoals = todayGoals.filter((goal) => goal.done).length;

  const totalChapters = chapters.length;

  const syllabusProgress = totalChapters
    ? Math.round((completedChapters / totalChapters) * 100)
    : 0;

  const activeDateSet = new Set(safeArray(analytics.activityDates));

  focusSessions.forEach((session) => {
    if (session.date) activeDateSet.add(session.date);
  });

  completionEvents.forEach((event) => {
    if (event.date) activeDateSet.add(event.date);
  });

  const allActiveDates = [...activeDateSet];
  const streak = getStreak(allActiveDates);

  // Existing XP rules: Winter Arc 10, chapter 20, focus session 15.
  const winterXP = completedTasks * 10;
  const chapterXP = completedChapters * 20;
  const focusXP = focusSessions.length * 15;
  const totalXP = winterXP + chapterXP + focusXP;

  const level = Math.floor(totalXP / 100) + 1;
  const levelProgress = totalXP % 100;

  const examDate = localStorage.getItem(STORAGE_KEYS.exam) || "";
  let daysRemaining = null;

  if (examDate) {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const target = new Date(`${examDate}T00:00:00`);

    if (!Number.isNaN(target.getTime())) {
      daysRemaining = Math.ceil(
        (target - todayDate) / (1000 * 60 * 60 * 24)
      );
    }
  }

  const subjectProgress = subjects.map((subject) => {
    const subjectChapters = safeArray(subject.chapters);
    const completed = subjectChapters.filter(
      (chapter) => chapter.status === "completed"
    ).length;

    return {
      name: subject.name || "Subject",
      completed,
      total: subjectChapters.length,
      percent: subjectChapters.length
        ? Math.round((completed / subjectChapters.length) * 100)
        : 0,
    };
  });

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(new Date(), index - 6);
    const key = dateKey(date);

    const focusMinutes = focusSessions
      .filter((session) => session.date === key)
      .reduce(
        (sum, session) => sum + Math.max(0, Number(session.minutes) || 0),
        0
      );

    const chaptersCompleted = completionEvents.filter(
      (event) => event.date === key
    ).length;

    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      day: date.getDate(),
      focusMinutes,
      chaptersCompleted,
      active: activeDateSet.has(key),
    };
  });

  const maxFocusMinutes = Math.max(
    30,
    ...week.map((day) => day.focusMinutes)
  );

  const recentActivity = [
    ...focusSessions.map((session) => ({
      id: `focus-${session.id}`,
      date: session.date,
      title: "Focus session completed",
      detail: `${Number(session.minutes) || 0} minutes of deep work`,
      icon: "⏱️",
    })),

    ...completionEvents.map((event) => ({
      id: `chapter-${event.id}`,
      date: event.date,
      title: event.chapter || "Chapter completed",
      detail: `${event.subject || "Subject"} · Chapter completed`,
      icon: "📚",
    })),

    ...tasks
      .filter((task) => task.done)
      .map((task, index) => ({
        id: `winter-${task.id || index}`,
        date: task.date || "",
        title: task.title || task.name || "Winter Arc mission",
        detail: "+10 XP · Winter Arc",
        icon: "❄️",
      })),
  ]
    .filter((item) => item.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const achievements = [
    {
      icon: "❄️",
      name: "Winter Warrior",
      rarity: "RARE",
      unlocked: completedTasks >= 5,
      detail: "Complete 5 Winter Arc missions",
    },
    {
      icon: "📚",
      name: "Knowledge Seeker",
      rarity: "RARE",
      unlocked: completedChapters >= 5,
      detail: "Complete 5 chapters",
    },
    {
      icon: "⏱️",
      name: "Focus Initiate",
      rarity: "RARE",
      unlocked: focusSessions.length >= 5,
      detail: "Complete 5 focus sessions",
    },
    {
      icon: "🔥",
      name: "Consistency",
      rarity: "EPIC",
      unlocked: streak >= 3,
      detail: "Build a 3-day study streak",
    },
    {
      icon: "👑",
      name: "Study Legend",
      rarity: "LEGENDARY",
      unlocked: completedChapters >= 50,
      detail: "Complete 50 chapters",
    },
  ];

  return {
    totalXP,
    winterXP,
    chapterXP,
    focusXP,
    level,
    levelProgress,
    completedTasks,
    totalTasks: tasks.length,
    completedChapters,
    totalChapters,
    syllabusProgress,
    totalFocusMinutes,
    todayMinutes,
    totalSessions: focusSessions.length,
    todaySessions: todaySessions.length,
    completedGoals,
    totalGoals: todayGoals.length,
    streak,
    daysRemaining,
    subjectProgress,
    week,
    maxFocusMinutes,
    activeDateSet: allActiveDates,
    recentActivity,
    achievements,
  };
}

export default function Dashboard({ onBack }) {
  const [stats, setStats] = useState(getInitialData);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    const refresh = () => setStats(getInitialData());

    const interval = window.setInterval(refresh, 1500);
    window.addEventListener("storage", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const unlockedAchievements = useMemo(
    () => stats.achievements.filter((item) => item.unlocked).length,
    [stats.achievements]
  );

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const date = new Date(year, month, index + 1);
        const key = dateKey(date);

        return {
          day: index + 1,
          key,
          active: stats.activeDateSet.includes(key),
          today: key === dateKey(),
        };
      }),
    ];
  }, [calendarMonth, stats.activeDateSet]);

  function changeMonth(amount) {
    setCalendarMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + amount, 1)
    );
  }

  return (
    <main className="px-dashboard">
      <header className="px-dash-header">
        <div>
          <button className="px-back" onClick={onBack}>
            ← BACK TO PROJECT X
          </button>

          <p className="px-eyebrow">PROJECT X / COMMAND CENTER</p>

          <h1>
            PLAYER <span>DASHBOARD 2.0</span>
          </h1>

          <p className="px-subtitle">
            Your progress. Your achievements. Your next level.
          </p>
        </div>

        <div className="px-player-badge">
          <span>PLAYER LEVEL</span>
          <strong>{stats.level}</strong>
          <small>ACTIVE PLAYER</small>
        </div>
      </header>

      <section className="px-level-panel">
        <div className="px-level-top">
          <div>
            <span className="px-label">CURRENT LEVEL</span>
            <h2>LEVEL {stats.level}</h2>
          </div>

          <div className="px-xp-total">
            <strong>{stats.totalXP.toLocaleString("en-IN")}</strong>
            <span>TOTAL XP</span>
          </div>
        </div>

        <div className="px-xp-track">
          <div style={{ width: `${stats.levelProgress}%` }} />
        </div>

        <div className="px-xp-bottom">
          <span>{stats.levelProgress} / 100 XP</span>
          <span>{100 - stats.levelProgress} XP TO NEXT LEVEL</span>
        </div>

        <div className="px-xp-breakdown">
          <span>❄️ Winter Arc <b>{stats.winterXP} XP</b></span>
          <span>📚 Chapters <b>{stats.chapterXP} XP</b></span>
          <span>⏱️ Focus <b>{stats.focusXP} XP</b></span>
        </div>
      </section>

      <DashboardGamification stats={stats} />

      <section className="px-stats-grid">
        <article className="px-stat-card">
          <span>⚡</span>
          <small>TOTAL XP</small>
          <strong>{stats.totalXP.toLocaleString("en-IN")}</strong>
          <p>Experience earned</p>
        </article>

        <article className="px-stat-card">
          <span>🔥</span>
          <small>STUDY STREAK</small>
          <strong>{stats.streak} DAYS</strong>
          <p>Recorded active days</p>
        </article>

        <article className="px-stat-card">
          <span>⏱️</span>
          <small>FOCUS TIME</small>
          <strong>{stats.totalFocusMinutes}</strong>
          <p>Total minutes recorded</p>
        </article>

        <article className="px-stat-card">
          <span>📚</span>
          <small>CHAPTERS</small>
          <strong>
            {stats.completedChapters}/{stats.totalChapters}
          </strong>
          <p>Chapters completed</p>
        </article>
      </section>

      <section className="px-main-grid">
        <article className="px-panel">
          <div className="px-panel-heading">
            <div>
              <span className="px-label">STUDY PERFORMANCE</span>
              <h2>Today's Activity</h2>
            </div>
            <span className="px-panel-icon">◈</span>
          </div>

          <div className="px-activity-row">
            <div>
              <span>Focus minutes</span>
              <strong>{stats.todayMinutes} min</strong>
            </div>
            <span className="px-mini-icon">⏱️</span>
          </div>

          <div className="px-activity-row">
            <div>
              <span>Focus sessions</span>
              <strong>{stats.todaySessions}</strong>
            </div>
            <span className="px-mini-icon">◷</span>
          </div>

          <div className="px-activity-row">
            <div>
              <span>Daily goals</span>
              <strong>{stats.completedGoals}/{stats.totalGoals}</strong>
            </div>
            <span className="px-mini-icon">🎯</span>
          </div>

          <div className="px-activity-row">
            <div>
              <span>Winter Arc missions</span>
              <strong>{stats.completedTasks}/{stats.totalTasks}</strong>
            </div>
            <span className="px-mini-icon">❄️</span>
          </div>
        </article>

        <article className="px-panel">
          <div className="px-panel-heading">
            <div>
              <span className="px-label">LEARNING PROGRESS</span>
              <h2>Syllabus Status</h2>
            </div>
            <span className="px-panel-icon">▦</span>
          </div>

          <div className="px-progress-number">
            {stats.syllabusProgress}<span>%</span>
          </div>

          <div className="px-progress-track">
            <div style={{ width: `${stats.syllabusProgress}%` }} />
          </div>

          <p className="px-muted">
            {stats.completedChapters} out of {stats.totalChapters} chapters completed.
          </p>

          <div className="px-exam-box">
            <span>📅 NEXT EXAM</span>
            {stats.daysRemaining === null ? (
              <strong>Not scheduled</strong>
            ) : stats.daysRemaining > 0 ? (
              <strong>{stats.daysRemaining} days remaining</strong>
            ) : stats.daysRemaining === 0 ? (
              <strong>It's exam day!</strong>
            ) : (
              <strong>Exam date has passed</strong>
            )}
          </div>
        </article>
      </section>

      <section className="px-panel px-weekly-panel">
        <div className="px-panel-heading">
          <div>
            <span className="px-label">LAST 7 DAYS</span>
            <h2>Weekly Study Analytics</h2>
          </div>
          <span className="px-panel-icon">▥</span>
        </div>

        <div className="px-week-summary">
          <div>
            <span>FOCUS MINUTES</span>
            <strong>
              {stats.week.reduce((sum, day) => sum + day.focusMinutes, 0)}
            </strong>
          </div>
          <div>
            <span>CHAPTERS COMPLETED</span>
            <strong>
              {stats.week.reduce((sum, day) => sum + day.chaptersCompleted, 0)}
            </strong>
          </div>
          <div>
            <span>ACTIVE DAYS</span>
            <strong>{stats.week.filter((day) => day.active).length}/7</strong>
          </div>
        </div>

        <div className="px-week-chart">
          {stats.week.map((day) => (
            <div className="px-chart-day" key={day.key}>
              <div className="px-chart-values">
                <span>{day.focusMinutes || "—"}</span>
                <span className="px-chart-chapters">
                  {day.chaptersCompleted ? `${day.chaptersCompleted} ch` : ""}
                </span>
              </div>

              <div className="px-chart-bar-area">
                <div
                  className={`px-chart-bar ${day.focusMinutes ? "has-data" : ""}`}
                  style={{
                    height: `${Math.max(
                      4,
                      (day.focusMinutes / stats.maxFocusMinutes) * 100
                    )}%`,
                  }}
                  title={`${day.focusMinutes} focus minutes`}
                />
              </div>

              <small>{day.label}</small>
              <span className="px-chart-date">{day.day}</span>
            </div>
          ))}
        </div>

        <p className="px-chart-note">
          Bars show focus minutes. Chapter counts appear above each day.
        </p>
      </section>

      <section className="px-main-grid px-analytics-grid">
        <article className="px-panel">
          <div className="px-panel-heading">
            <div>
              <span className="px-label">SHOW UP EVERY DAY</span>
              <h2>Study Activity Calendar</h2>
            </div>
            <span className="px-panel-icon">▦</span>
          </div>

          <div className="px-calendar-header">
            <button onClick={() => changeMonth(-1)} aria-label="Previous month">
              ‹
            </button>

            <strong>
              {calendarMonth.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </strong>

            <button onClick={() => changeMonth(1)} aria-label="Next month">
              ›
            </button>
          </div>

          <div className="px-calendar-grid">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <span className="px-calendar-weekday" key={`${day}-${index}`}>
                {day}
              </span>
            ))}

            {calendarCells.map((cell, index) =>
              cell ? (
                <span
                  className={`px-calendar-day ${cell.active ? "active" : ""} ${
                    cell.today ? "today" : ""
                  }`}
                  key={cell.key}
                  title={cell.active ? `${cell.key}: study activity recorded` : cell.key}
                >
                  {cell.day}
                </span>
              ) : (
                <span className="px-calendar-empty" key={`empty-${index}`} />
              )
            )}
          </div>

          <div className="px-calendar-legend">
            <span />
            Study activity recorded
          </div>
        </article>

        <article className="px-panel">
          <div className="px-panel-heading">
            <div>
              <span className="px-label">SUBJECT BREAKDOWN</span>
              <h2>Learning Progress</h2>
            </div>
            <span className="px-panel-icon">◉</span>
          </div>

          {stats.subjectProgress.length === 0 ? (
            <div className="px-empty-state">
              <span>📚</span>
              <strong>No subjects yet</strong>
              <p>Add subjects and chapters in Syllabus Tracker to see progress.</p>
            </div>
          ) : (
            <div className="px-subject-list">
              {stats.subjectProgress.map((subject) => (
                <div className="px-subject-item" key={subject.name}>
                  <div className="px-subject-top">
                    <strong>{subject.name}</strong>
                    <span>
                      {subject.completed}/{subject.total} · {subject.percent}%
                    </span>
                  </div>

                  <div className="px-subject-track">
                    <div style={{ width: `${subject.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-consistency-box">
            <span>🔥 CURRENT STREAK</span>
            <strong>{stats.streak} {stats.streak === 1 ? "day" : "days"}</strong>
            <small>
              {stats.streak >= 7
                ? "Amazing consistency!"
                : stats.streak >= 3
                ? "You're building momentum!"
                : "A little progress counts. Keep going!"}
            </small>
          </div>
        </article>
      </section>

      <section className="px-main-grid px-analytics-grid">
        <article className="px-panel">
          <div className="px-panel-heading">
            <div>
              <span className="px-label">GOAL TRACKER</span>
              <h2>Daily Goal Analytics</h2>
            </div>
            <span className="px-panel-icon">🎯</span>
          </div>

          <div className="px-goal-score">
            <strong>
              {stats.completedGoals}
              <span>/{stats.totalGoals}</span>
            </strong>
            <p>Today's goals completed</p>

            <div className="px-progress-track">
              <div
                style={{
                  width: `${
                    stats.totalGoals
                      ? (stats.completedGoals / stats.totalGoals) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="px-goal-detail-grid">
            <div>
              <span>COMPLETED</span>
              <strong>{stats.completedGoals}</strong>
            </div>
            <div>
              <span>REMAINING</span>
              <strong>
                {Math.max(0, stats.totalGoals - stats.completedGoals)}
              </strong>
            </div>
            <div>
              <span>COMPLETION</span>
              <strong>
                {stats.totalGoals
                  ? Math.round((stats.completedGoals / stats.totalGoals) * 100)
                  : 0}%
              </strong>
            </div>
          </div>
        </article>

        <article className="px-panel">
          <div className="px-panel-heading">
            <div>
              <span className="px-label">RECENT LOG</span>
              <h2>Latest Activity</h2>
            </div>
            <span className="px-panel-icon">◷</span>
          </div>

          {stats.recentActivity.length === 0 ? (
            <div className="px-empty-state">
              <span>✨</span>
              <strong>Your story starts here</strong>
              <p>Complete a focus session or chapter to see it here.</p>
            </div>
          ) : (
            <div className="px-recent-list">
              {stats.recentActivity.map((item) => (
                <div className="px-recent-item" key={item.id}>
                  <span className="px-recent-icon">{item.icon}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                  <time>{item.date}</time>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="px-panel px-achievements">
        <div className="px-panel-heading">
          <div>
            <span className="px-label">YOUR TROPHY ROOM</span>
            <h2>Achievements</h2>
          </div>

          <span className="px-unlocked-count">
            {unlockedAchievements}/{stats.achievements.length} UNLOCKED
          </span>
        </div>

        <div className="px-achievement-grid">
          {stats.achievements.map((achievement) => (
            <article
              className={`px-achievement ${
                achievement.unlocked ? "unlocked" : "locked"
              } rarity-${achievement.rarity.toLowerCase()}`}
              key={achievement.name}
            >
              <span className="px-achievement-icon">
                {achievement.unlocked ? achievement.icon : "🔒"}
              </span>

              <span className="px-rarity-tag">{achievement.rarity}</span>
              <strong>{achievement.name}</strong>
              <small>{achievement.detail}</small>

              <span className="px-achievement-status">
                {achievement.unlocked ? "UNLOCKED" : "LOCKED"}
              </span>
            </article>
          ))}
        </div>
      </section>

      <footer className="px-dash-footer">
        PROJECT X <span>✦</span> PLAYER COMMAND CENTER
        <small>YOUR JOURNEY. YOUR PROGRESS.</small>
      </footer>
    </main>
  );
}