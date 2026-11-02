import { useEffect, useMemo, useState } from "react";
import "./SyllabusTracker.css";

const STORAGE_KEY = "project-x-syllabus-v1";
const EXAM_DATE_KEY = "project-x-exam-date";
const ANALYTICS_KEY = "project-x-study-analytics";

const initialSubjects = [
  {
    id: 1,
    name: "Mathematics",
    icon: "∑",
    color: "#a78bfa",
    chapters: [
      { id: 11, name: "Number Systems", status: "completed" },
      { id: 12, name: "Algebra", status: "in-progress" },
      { id: 13, name: "Geometry", status: "not-started" },
    ],
  },
  {
    id: 2,
    name: "Science",
    icon: "✧",
    color: "#65d6b0",
    chapters: [
      { id: 21, name: "Physics", status: "completed" },
      { id: 22, name: "Chemistry", status: "not-started" },
    ],
  },
  {
    id: 3,
    name: "English",
    icon: "Aa",
    color: "#f6b96b",
    chapters: [
      { id: 31, name: "Grammar", status: "in-progress" },
      { id: 32, name: "Literature", status: "not-started" },
    ],
  },
];

const emptyAnalytics = {
  activityDates: [],
  completionEvents: [],
};

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default function SyllabusTracker({ onBack }) {
  const [subjects, setSubjects] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : initialSubjects;
    } catch {
      return initialSubjects;
    }
  });

  const [examDate, setExamDate] = useState(
    () => localStorage.getItem(EXAM_DATE_KEY) || ""
  );

  const [analytics, setAnalytics] = useState(() => {
    try {
      const saved = localStorage.getItem(ANALYTICS_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        return {
          activityDates: parsed.activityDates || [],
          completionEvents: parsed.completionEvents || [],
        };
      }
    } catch {
      return emptyAnalytics;
    }

    return emptyAnalytics;
  });

  const [newSubject, setNewSubject] = useState("");
  const [newChapter, setNewChapter] = useState({});
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    if (examDate) {
      localStorage.setItem(EXAM_DATE_KEY, examDate);
    } else {
      localStorage.removeItem(EXAM_DATE_KEY);
    }
  }, [examDate]);

  useEffect(() => {
    localStorage.setItem(
      ANALYTICS_KEY,
      JSON.stringify(analytics)
    );
  }, [analytics]);

  const allChapters = subjects.flatMap(
    (subject) => subject.chapters
  );

  const completed = allChapters.filter(
    (chapter) => chapter.status === "completed"
  ).length;

  const inProgress = allChapters.filter(
    (chapter) => chapter.status === "in-progress"
  ).length;

  const total = allChapters.length;

  const overallProgress = total
    ? Math.round((completed / total) * 100)
    : 0;

  const filteredSubjects = useMemo(() => {
    return subjects.map((subject) => ({
      ...subject,
      chapters:
        filter === "all"
          ? subject.chapters
          : subject.chapters.filter(
              (chapter) => chapter.status === filter
            ),
    }));
  }, [subjects, filter]);

  const daysRemaining = (() => {
    if (!examDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(`${examDate}T00:00:00`);

    if (Number.isNaN(target.getTime())) return null;

    return Math.ceil(
      (target - today) / (1000 * 60 * 60 * 24)
    );
  })();

  // DAILY STUDY STREAK

  const studyStreak = useMemo(() => {
    const activeDays = new Set(analytics.activityDates);

    const today = new Date();
    const todayKey = getDateKey(today);

    let currentDate = new Date(today);

    if (!activeDays.has(todayKey)) {
      currentDate.setDate(currentDate.getDate() - 1);

      if (!activeDays.has(getDateKey(currentDate))) {
        return 0;
      }
    }

    let streak = 0;

    while (activeDays.has(getDateKey(currentDate))) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }, [analytics.activityDates]);

  // LAST 7 DAYS ANALYTICS

  const weeklyData = useMemo(() => {
    const today = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const dateKey = getDateKey(date);

      const count = analytics.completionEvents.filter(
        (event) => event.date === dateKey
      ).length;

      days.push({
        date: dateKey,
        label: date.toLocaleDateString("en-IN", {
          weekday: "short",
        }),
        count,
      });
    }

    return days;
  }, [analytics.completionEvents]);

  const weeklyTotal = weeklyData.reduce(
    (sum, day) => sum + day.count,
    0
  );

  const activeDaysThisWeek = weeklyData.filter(
    (day) =>
      analytics.activityDates.includes(day.date)
  ).length;

  // STUDY MILESTONES

  const milestones = [
    {
      target: 1,
      title: "First Step",
      description: "Complete your first chapter.",
      icon: "🌱",
    },
    {
      target: 5,
      title: "Getting Started",
      description: "Complete 5 chapters.",
      icon: "⚡",
    },
    {
      target: 10,
      title: "Consistency",
      description: "Complete 10 chapters.",
      icon: "🔥",
    },
    {
      target: 25,
      title: "Knowledge Builder",
      description: "Complete 25 chapters.",
      icon: "🏆",
    },
    {
      target: 50,
      title: "Study Legend",
      description: "Complete 50 chapters.",
      icon: "👑",
    },
  ];

  const nextMilestone = milestones.find(
    (milestone) => completed < milestone.target
  );

  function addSubject(event) {
    event.preventDefault();

    const name = newSubject.trim();
    if (!name) return;

    const colors = [
      "#a78bfa",
      "#65d6b0",
      "#f6b96b",
      "#79aaff",
    ];

    setSubjects((previous) => [
      ...previous,
      {
        id: Date.now(),
        name,
        icon: "▦",
        color: colors[previous.length % colors.length],
        chapters: [],
      },
    ]);

    setNewSubject("");
  }

  function addChapter(event, subjectId) {
    event.preventDefault();

    const name = (newChapter[subjectId] || "").trim();
    if (!name) return;

    setSubjects((previous) =>
      previous.map((subject) =>
        subject.id === subjectId
          ? {
              ...subject,
              chapters: [
                ...subject.chapters,
                {
                  id: Date.now(),
                  name,
                  status: "not-started",
                },
              ],
            }
          : subject
      )
    );

    setNewChapter((previous) => ({
      ...previous,
      [subjectId]: "",
    }));
  }

  function updateStatus(subjectId, chapterId, status) {
    const subject = subjects.find(
      (item) => item.id === subjectId
    );

    const chapter = subject?.chapters.find(
      (item) => item.id === chapterId
    );

    if (!chapter || chapter.status === status) return;

    setSubjects((previous) =>
      previous.map((item) =>
        item.id === subjectId
          ? {
              ...item,
              chapters: item.chapters.map((chapterItem) =>
                chapterItem.id === chapterId
                  ? { ...chapterItem, status }
                  : chapterItem
              ),
            }
          : item
      )
    );

    // Track meaningful study activity.
    if (status === "in-progress" || status === "completed") {
      const todayKey = getDateKey(new Date());

      setAnalytics((previous) => ({
        ...previous,

        activityDates: previous.activityDates.includes(todayKey)
          ? previous.activityDates
          : [...previous.activityDates, todayKey],

        completionEvents:
          status === "completed"
            ? [
                ...previous.completionEvents,
                {
                  id: Date.now(),
                  date: todayKey,
                  subject: subject.name,
                  chapter: chapter.name,
                },
              ]
            : previous.completionEvents,
      }));
    }
  }

  function deleteChapter(subjectId, chapterId) {
    setSubjects((previous) =>
      previous.map((subject) =>
        subject.id === subjectId
          ? {
              ...subject,
              chapters: subject.chapters.filter(
                (chapter) => chapter.id !== chapterId
              ),
            }
          : subject
      )
    );
  }

  function deleteSubject(subjectId) {
    if (
      !window.confirm(
        "Delete this subject and all its chapters?"
      )
    ) {
      return;
    }

    setSubjects((previous) =>
      previous.filter(
        (subject) => subject.id !== subjectId
      )
    );
  }

  function getProgress(chapters) {
    if (!chapters.length) return 0;

    const completedChapters = chapters.filter(
      (chapter) => chapter.status === "completed"
    ).length;

    return Math.round(
      (completedChapters / chapters.length) * 100
    );
  }

  return (
    <div className="syllabus-page">
      <header className="syllabus-header">
        <button
          className="syllabus-back"
          onClick={onBack}
        >
          ← Back to Project X
        </button>

        <div className="syllabus-brand">
          PROJECT <span>X</span>
        </div>
      </header>

      <main className="syllabus-container">
        <section className="syllabus-heading">
          <div>
            <p className="syllabus-eyebrow">
              YOUR LEARNING JOURNEY / 003
            </p>

            <h1>
              Syllabus <span>Tracker.</span>
            </h1>

            <p>
              Every chapter completed is another step forward.
              Keep your learning organised.
            </p>
          </div>

          <div className="syllabus-heading-icon">
            ▦
          </div>
        </section>

        {/* EXAM COUNTDOWN */}

        <section className="exam-countdown">
          <div>
            <p className="syllabus-eyebrow">
              YOUR NEXT BIG DAY
            </p>

            <h2>
              Exam Countdown <span>.</span>
            </h2>

            <p className="exam-description">
              Set your exam date and stay prepared.
            </p>

            {examDate && (
              <div className="exam-selected-date">
                Exam Date:{" "}
                {new Date(
                  `${examDate}T00:00:00`
                ).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            )}
          </div>

          <div className="exam-date-control">
            <input
              type="date"
              value={examDate}
              min={getDateKey(new Date())}
              onChange={(event) =>
                setExamDate(event.target.value)
              }
              aria-label="Select exam date"
            />

            {examDate && (
              <div className="exam-countdown-result">
                {daysRemaining > 0 ? (
                  <>
                    <strong>{daysRemaining}</strong>
                    <span>DAYS REMAINING</span>
                  </>
                ) : daysRemaining === 0 ? (
                  <strong className="exam-day-message">
                    🎉 It's Exam Day!
                  </strong>
                ) : (
                  <strong className="exam-passed-message">
                    Exam date has passed.
                  </strong>
                )}
              </div>
            )}
          </div>
        </section>

        {/* OVERALL PROGRESS */}

        <section className="syllabus-overview">
          <div className="overview-main">
            <div className="overview-label">
              OVERALL COMPLETION
            </div>

            <div className="overview-number">
              {overallProgress}%
            </div>

            <div className="overview-track">
              <div
                className="overview-fill"
                style={{
                  width: `${overallProgress}%`,
                }}
              />
            </div>

            <p>
              {completed} of {total} chapters completed
            </p>
          </div>

          <div className="overview-stat">
            <span className="stat-icon completed-icon">
              ✓
            </span>
            <strong>{completed}</strong>
            <span>Completed</span>
          </div>

          <div className="overview-stat">
            <span className="stat-icon progress-icon">
              ◷
            </span>
            <strong>{inProgress}</strong>
            <span>In Progress</span>
          </div>

          <div className="overview-stat">
            <span className="stat-icon pending-icon">
              ○
            </span>
            <strong>
              {total - completed - inProgress}
            </strong>
            <span>Not Started</span>
          </div>
        </section>

        {/* STUDY ANALYTICS */}

        <section className="analytics-section">
          <div className="analytics-heading">
            <div>
              <p className="syllabus-eyebrow">
                YOUR PERFORMANCE
              </p>

              <h2>
                Study <span>Analytics.</span>
              </h2>

              <p>
                Small steps, tracked over time.
              </p>
            </div>

            <div className="analytics-live-badge">
              <span />
              LIVE TRACKING
            </div>
          </div>

          {/* ANALYTICS STATS */}

          <div className="analytics-stats">
            <article className="analytics-stat-card streak-card">
              <div className="analytics-stat-icon">🔥</div>

              <div>
                <span>DAILY STUDY STREAK</span>
                <strong>{studyStreak} Days</strong>
                <p>
                  {studyStreak > 0
                    ? "Keep the momentum going!"
                    : "Start your streak today!"}
                </p>
              </div>
            </article>

            <article className="analytics-stat-card">
              <div className="analytics-stat-icon">📚</div>

              <div>
                <span>CHAPTERS COMPLETED</span>
                <strong>{completed}</strong>
                <p>Your total completed chapters.</p>
              </div>
            </article>

            <article className="analytics-stat-card">
              <div className="analytics-stat-icon">📅</div>

              <div>
                <span>ACTIVE DAYS THIS WEEK</span>
                <strong>{activeDaysThisWeek}/7</strong>
                <p>Days with recorded study activity.</p>
              </div>
            </article>

            <article className="analytics-stat-card">
              <div className="analytics-stat-icon">⚡</div>

              <div>
                <span>THIS WEEK</span>
                <strong>{weeklyTotal}</strong>
                <p>Chapters completed this week.</p>
              </div>
            </article>
          </div>

          {/* WEEKLY GRAPH */}

          <div className="analytics-grid">
            <article className="analytics-panel weekly-panel">
              <div className="analytics-panel-heading">
                <div>
                  <p className="syllabus-eyebrow">
                    YOUR CONSISTENCY
                  </p>

                  <h3>Weekly Progress</h3>
                </div>

                <span className="weekly-label">
                  LAST 7 DAYS
                </span>
              </div>

              <div className="weekly-chart">
                {weeklyData.map((day) => (
                  <div
                    className="chart-day"
                    key={day.date}
                  >
                    <div className="chart-bar-area">
                      {day.count > 0 && (
                        <span className="chart-count">
                          {day.count}
                        </span>
                      )}

                      <div
                        className={`chart-bar ${
                          day.count > 0 ? "has-value" : ""
                        }`}
                        style={{
                          height: `${
                            day.count > 0
                              ? Math.max(
                                  12,
                                  (day.count /
                                    Math.max(
                                      1,
                                      ...weeklyData.map(
                                        (item) => item.count
                                      )
                                    )) *
                                    100
                                )
                              : 5
                          }%`,
                        }}
                      />
                    </div>

                    <span className="chart-day-label">
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="chart-caption">
                Completed chapters recorded each day.
              </p>
            </article>

            {/* MILESTONES */}

            <article className="analytics-panel milestone-panel">
              <div className="analytics-panel-heading">
                <div>
                  <p className="syllabus-eyebrow">
                    KEEP LEVELING UP
                  </p>

                  <h3>Next Milestone</h3>
                </div>

                <span className="milestone-trophy">🏆</span>
              </div>

              {nextMilestone ? (
                <>
                  <div className="next-milestone">
                    <span>{nextMilestone.icon}</span>

                    <div>
                      <strong>{nextMilestone.title}</strong>
                      <p>{nextMilestone.description}</p>
                    </div>
                  </div>

                  <div className="milestone-progress-info">
                    <span>
                      {completed} / {nextMilestone.target}
                    </span>

                    <span>
                      {Math.min(
                        100,
                        Math.round(
                          (completed / nextMilestone.target) * 100
                        )
                      )}%
                    </span>
                  </div>

                  <div className="milestone-track">
                    <div
                      style={{
                        width: `${
                          Math.min(
                            100,
                            (completed / nextMilestone.target) * 100
                          )
                        }%`,
                      }}
                    />
                  </div>

                  <p className="milestone-remaining">
                    {nextMilestone.target - completed} more chapters
                    to unlock!
                  </p>
                </>
              ) : (
                <div className="all-milestones">
                  👑
                  <strong>Study Legend!</strong>
                  <p>You've unlocked every milestone.</p>
                </div>
              )}
            </article>
          </div>

          {/* MILESTONE COLLECTION */}

          <div className="milestone-collection">
            <div className="collection-heading">
              <div>
                <p className="syllabus-eyebrow">
                  YOUR ACHIEVEMENTS
                </p>

                <h3>Milestone Collection</h3>
              </div>

              <span>
                {milestones.filter(
                  (item) => completed >= item.target
                ).length}
                /{milestones.length} UNLOCKED
              </span>
            </div>

            <div className="milestone-list">
              {milestones.map((milestone) => {
                const unlocked = completed >= milestone.target;

                return (
                  <div
                    className={`milestone-item ${
                      unlocked ? "unlocked" : ""
                    }`}
                    key={milestone.target}
                  >
                    <div className="milestone-item-icon">
                      {unlocked ? milestone.icon : "🔒"}
                    </div>

                    <strong>{milestone.title}</strong>

                    <span>
                      {milestone.target} Chapters
                    </span>

                    <small>
                      {unlocked ? "UNLOCKED" : "LOCKED"}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SUBJECT MANAGEMENT */}

        <section className="syllabus-toolbar">
          <div>
            <p className="syllabus-eyebrow">
              YOUR SUBJECTS
            </p>
            <h2>Manage your syllabus.</h2>
          </div>

          <form
            className="add-subject-form"
            onSubmit={addSubject}
          >
            <input
              value={newSubject}
              onChange={(event) =>
                setNewSubject(event.target.value)
              }
              placeholder="New subject name..."
              aria-label="New subject name"
            />

            <button type="submit">
              + Add Subject
            </button>
          </form>
        </section>

        <div className="syllabus-filters">
          {[
            ["all", "All Chapters"],
            ["not-started", "Not Started"],
            ["in-progress", "In Progress"],
            ["completed", "Completed"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="subject-list">
          {filteredSubjects.map((subject) => {
            const progress = getProgress(subject.chapters);
            const isExpanded =
              expandedSubject === subject.id;

            return (
              <article
                className="subject-card"
                key={subject.id}
              >
                <div className="subject-top">
                  <div
                    className="subject-icon"
                    style={{ color: subject.color }}
                  >
                    {subject.icon}
                  </div>

                  <div className="subject-information">
                    <h3>{subject.name}</h3>
                    <p>
                      {subject.chapters.length} chapters ·{" "}
                      {progress}% complete
                    </p>
                  </div>

                  <div className="subject-progress">
                    <strong>{progress}%</strong>

                    <div className="subject-progress-track">
                      <div
                        style={{
                          width: `${progress}%`,
                          background: subject.color,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    className="expand-subject"
                    onClick={() =>
                      setExpandedSubject(
                        isExpanded ? null : subject.id
                      )
                    }
                    aria-label="Expand subject"
                  >
                    {isExpanded ? "−" : "+"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="subject-details">
                    {subject.chapters.length === 0 && (
                      <p className="empty-chapters">
                        No chapters yet. Add your first chapter below.
                      </p>
                    )}

                    {subject.chapters.map((chapter) => {
                      if (
                        filter !== "all" &&
                        chapter.status !== filter
                      ) {
                        return null;
                      }

                      return (
                        <div
                          className="chapter-row"
                          key={chapter.id}
                        >
                          <span className="chapter-name">
                            <span
                              className={`chapter-status-dot ${chapter.status}`}
                            />
                            {chapter.name}
                          </span>

                          <select
                            value={chapter.status}
                            onChange={(event) =>
                              updateStatus(
                                subject.id,
                                chapter.id,
                                event.target.value
                              )
                            }
                            aria-label={`Status of ${chapter.name}`}
                          >
                            <option value="not-started">
                              Not Started
                            </option>
                            <option value="in-progress">
                              In Progress
                            </option>
                            <option value="completed">
                              Completed
                            </option>
                          </select>

                          <button
                            className="delete-chapter"
                            onClick={() =>
                              deleteChapter(
                                subject.id,
                                chapter.id
                              )
                            }
                            aria-label={`Delete ${chapter.name}`}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}

                    <form
                      className="add-chapter-form"
                      onSubmit={(event) =>
                        addChapter(event, subject.id)
                      }
                    >
                      <input
                        value={newChapter[subject.id] || ""}
                        onChange={(event) =>
                          setNewChapter((previous) => ({
                            ...previous,
                            [subject.id]: event.target.value,
                          }))
                        }
                        placeholder="Enter chapter name..."
                        aria-label={`New chapter for ${subject.name}`}
                      />

                      <button type="submit">
                        + Add Chapter
                      </button>
                    </form>

                    <button
                      className="delete-subject"
                      onClick={() =>
                        deleteSubject(subject.id)
                      }
                    >
                      Delete subject
                    </button>
                  </div>
                )}
              </article>
            );
          })}

          {filteredSubjects.length === 0 && (
            <div className="syllabus-empty">
              <span>▦</span>
              <h3>No subjects yet.</h3>
              <p>
                Add a subject to start organising your syllabus.
              </p>
            </div>
          )}
        </section>

        <footer className="syllabus-footer">
          <span>PROJECT X / SYLLABUS TRACKER</span>
          <span>SMALL STEPS. BIG PROGRESS.</span>
        </footer>
      </main>
    </div>
  );
}