"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity,
  AlarmClock,
  ArrowDownUp,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Coffee,
  GraduationCap,
  House,
  ListTodo,
  Minus,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings2,
  Shuffle,
  SkipForward,
  Sparkles,
  Star,
  Sun,
  TimerReset,
  X,
} from "lucide-react";
import {
  DayType,
  Task,
  TaskType,
  PlannedSession,
  Block,
  generateSchedule,
  prettyTime,
  toMinutes,
  recoverMissedTask,
  ClassSlot,
} from "@/lib/scheduler";
import { Challenge, challengeStatus } from "@/lib/challenges";
type SavedState = {
  tasks: Task[];
  selectedDay: DayType;
  schedules: Record<string, PlannedSession[]>;
  activity: Record<string, number>;
  blocks: Record<string, Block[]>;
  completedIds: string[];
  classes?: ClassSlot[];
  challenges?: Challenge[];
};
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const uid = () => Math.random().toString(36).slice(2, 10);
const defaults: Task[] = [
  {
    id: "dsa",
    name: "DSA focus",
    duration: 120,
    stars: 5,
    splittable: true,
    minChunk: 30,
    dayTypes: ["college", "home", "holiday", "custom"],
    taskType: "study",
    earliest: "07:00",
    latest: "22:30",
    recurring: true,
    enabled: true,
  },
  {
    id: "dev",
    name: "Development",
    duration: 90,
    stars: 4,
    splittable: true,
    minChunk: 30,
    dayTypes: ["college", "home", "holiday", "custom"],
    taskType: "study",
    earliest: "07:00",
    latest: "22:00",
    recurring: false,
    enabled: true,
  },
  {
    id: "system",
    name: "System design course",
    duration: 60,
    stars: 3,
    splittable: false,
    minChunk: 30,
    dayTypes: ["home", "holiday", "custom"],
    taskType: "study",
    earliest: "09:00",
    latest: "21:00",
    recurring: false,
    enabled: true,
  },
  {
    id: "breakfast",
    name: "Breakfast",
    duration: 60,
    stars: 0,
    splittable: false,
    minChunk: 30,
    dayTypes: ["college", "home", "holiday", "custom"],
    taskType: "routine",
    fixedStart: "09:00",
    fixedEnd: "10:00",
    recurring: true,
    enabled: true,
  },
  {
    id: "bath",
    name: "Get ready / shower",
    duration: 60,
    stars: 0,
    splittable: false,
    minChunk: 30,
    dayTypes: ["home", "holiday", "custom"],
    taskType: "routine",
    fixedStart: "10:00",
    fixedEnd: "11:00",
    recurring: true,
    enabled: true,
  },
  {
    id: "dinner",
    name: "Dinner",
    duration: 60,
    stars: 0,
    splittable: false,
    minChunk: 30,
    dayTypes: ["college", "home", "holiday", "custom"],
    taskType: "routine",
    fixedStart: "22:00",
    fixedEnd: "23:00",
    recurring: true,
    enabled: true,
  },
  {
    id: "dishes",
    name: "Dishes",
    duration: 30,
    stars: 0,
    splittable: false,
    minChunk: 30,
    dayTypes: ["college", "home", "holiday", "custom"],
    taskType: "routine",
    fixedStart: "23:00",
    fixedEnd: "23:30",
    recurring: true,
    enabled: true,
  },
  {
    id: "chess",
    name: "Play chess",
    duration: 30,
    stars: 1,
    splittable: false,
    minChunk: 30,
    dayTypes: ["home", "holiday", "custom"],
    taskType: "hobby",
    earliest: "11:00",
    latest: "21:30",
    recurring: false,
    enabled: true,
  },
  {
    id: "college-python",
    name: "Python class",
    duration: 60,
    stars: 4,
    splittable: false,
    minChunk: 60,
    dayTypes: ["college"],
    taskType: "class",
    fixedStart: "11:00",
    fixedEnd: "12:00",
    recurring: true,
    enabled: true,
  },
];
const dayLabels: Record<DayType, string> = {
  college: "College day",
  home: "Home day",
  holiday: "Holiday",
  custom: "Custom day",
};
const dayIcons: Record<DayType, typeof GraduationCap> = {
  college: GraduationCap,
  home: House,
  holiday: Sun,
  custom: Settings2,
};
const today = todayKey();
function dateLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
function Stars({ value, small = false }: { value: number; small?: boolean }) {
  return (
    <span
      className={`stars ${small ? "stars-small" : ""}`}
      aria-label={`${value} stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={small ? 11 : 13}
          fill={n <= value ? "currentColor" : "none"}
          strokeWidth={n <= value ? 2.5 : 1.5}
          className={n <= value ? "star-on" : "star-off"}
        />
      ))}
    </span>
  );
}
function fmtDuration(n: number) {
  if (n < 60) return `${n}m`;
  const h = Math.floor(n / 60),
    m = n % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>(defaults);
  const [selectedDay, setSelectedDay] = useState<DayType>("home");
  const [schedules, setSchedules] = useState<Record<string, PlannedSession[]>>(
    {},
  );
  const [activity, setActivity] = useState<Record<string, number>>({});
  const [blocks, setBlocks] = useState<Record<string, Block[]>>({
    college: [
      { start: 8 * 60, end: 9 * 60, name: "Commute to college" },
      { start: 16 * 60, end: 18 * 60, name: "Commute home" },
    ],
    home: [],
    holiday: [],
    custom: [],
  });
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskName, setTaskName] = useState("");
  const [duration, setDuration] = useState("60");
  const [stars, setStars] = useState(2);
  const [splittable, setSplittable] = useState(true);
  const [minChunk, setMinChunk] = useState("30");
  const [taskType, setTaskType] = useState<TaskType>("study");
  const [taskDays, setTaskDays] = useState<DayType[]>(["home", "holiday"]);
  const [earliest, setEarliest] = useState("09:00");
  const [latest, setLatest] = useState("21:00");
  const [fixed, setFixed] = useState(false);
  const [fixedStart, setFixedStart] = useState("10:00");
  const [fixedEnd, setFixedEnd] = useState("11:00");
  const [examDate, setExamDate] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [timerMode, setTimerMode] = useState<"focus" | "stopwatch">("focus");
  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [activeSession, setActiveSession] = useState<PlannedSession | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [activeNav, setActiveNav] = useState("Today");
  const [classes, setClasses] = useState<ClassSlot[]>([]);
  const [cName, setCName] = useState("");
  const [cDay, setCDay] = useState(1);
  const [cStart, setCStart] = useState("11:00");
  const [cEnd, setCEnd] = useState("12:00");
  const [cAttend, setCAttend] = useState(true);
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [chName, setChName] = useState("");
  const [chDays, setChDays] = useState("30");
  const [chMode, setChMode] = useState<"up" | "down">("up");
  const [bDay, setBDay] = useState<DayType>("college");
  const [bName, setBName] = useState("");
  const [bStart, setBStart] = useState("08:00");
  const [bEnd, setBEnd] = useState("09:00");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("worthwhile-v1");
      if (raw) {
        const s = JSON.parse(raw) as Partial<SavedState>;
        if (s.tasks?.length) setTasks(s.tasks);
        if (s.selectedDay) setSelectedDay(s.selectedDay);
        if (s.schedules) setSchedules(s.schedules);
        if (s.activity) setActivity(s.activity);
        if (s.blocks) setBlocks(s.blocks);
        if (s.completedIds) setCompletedIds(s.completedIds);
        if (s.classes) setClasses(s.classes);
        if (s.challenges) setChallenges(s.challenges);
      }
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const s: SavedState = {
      tasks,
      selectedDay,
      schedules,
      activity,
      blocks,
      completedIds,
      classes,
      challenges,
    };
    localStorage.setItem("worthwhile-v1", JSON.stringify(s));
  }, [
    hydrated,
    tasks,
    selectedDay,
    schedules,
    activity,
    blocks,
    completedIds,
    classes,
    challenges,
  ]);
  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now();
    const baseRemaining = remaining;
    const baseElapsed = elapsed;
    const id = window.setInterval(() => {
      const delta = Math.floor((Date.now() - startedAt) / 1000);
      if (timerMode === "focus") {
        const next = Math.max(0, baseRemaining - delta);
        setRemaining(next);
        if (next === 0) {
          setRunning(false);
          setNotice(
            "Focus session complete. Take a breath, then decide what comes next.",
          );
        }
      } else {
        setElapsed(baseElapsed + delta);
      }
    }, 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, timerMode]);

  const currentSchedule = schedules[today] ?? [];
  const currentTasks = tasks.filter(
    (t) => t.enabled && t.dayTypes.includes(selectedDay),
  );
  const planned = currentSchedule.filter((s) => s.status === "planned");
  const completedToday = currentSchedule.filter((s) => s.status === "done");
  const totalFocus = completedToday
    .filter((s) => s.taskType === "study")
    .reduce((a, s) => a + s.end - s.start, 0);
  const generated = currentSchedule.length > 0;
  const nextSession = planned.find(
    (s) => s.end > new Date().getHours() * 60 + new Date().getMinutes(),
  );
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const shuffleSchedule = useCallback(
    (rebuild = false) => {
      const previous = schedules[today] ?? [];
      const locked = previous.filter((s) => s.status === "done");
      const result = generateSchedule({
        tasks,
        dayType: selectedDay,
        today,
        blocks: [
          ...(blocks[selectedDay] ?? []),
          ...(selectedDay === "college"
            ? classes
                .filter((c) => c.day === new Date().getDay() && c.attend)
                .map((c) => ({ start: c.start, end: c.end, name: c.name }))
            : []),
        ],
        existing: locked,
        seed: Date.now(),
      });
      const classRows: PlannedSession[] =
        selectedDay === "college"
          ? classes
              .filter((c) => c.day === new Date().getDay() && c.attend)
              .map((c) => ({
                id: `class-${c.id}`,
                taskId: `class-${c.id}`,
                taskName: c.name,
                start: c.start,
                end: c.end,
                stars: 0,
                taskType: "class" as const,
                fixed: true,
                status: "planned" as const,
              }))
          : [];
      setSchedules((prev) => ({
        ...prev,
        [today]: [...result.sessions, ...classRows].sort(
          (a, b) => a.start - b.start,
        ),
      }));
      setNotice(
        result.unplaced.length || result.conflicts.length
          ? `Schedule created with ${result.unplaced.length + result.conflicts.length} item(s) needing attention.`
          : rebuild
            ? "Fresh shuffle ready. Your fixed commitments stayed put."
            : "Your day is ready. A little structure, a little surprise.",
      );
      setActiveNav("Today");
    },
    [tasks, selectedDay, blocks, schedules, classes],
  );

  function openNewTask(task?: Task) {
    setEditingTask(task ?? null);
    setTaskName(task?.name ?? "");
    setDuration(String(task?.duration ?? 60));
    setStars(task?.stars ?? 2);
    setSplittable(task?.splittable ?? true);
    setMinChunk(String(task?.minChunk ?? 30));
    setTaskType(task?.taskType ?? "study");
    setTaskDays(task?.dayTypes ?? [selectedDay]);
    setEarliest(task?.earliest ?? "09:00");
    setLatest(task?.latest ?? "21:00");
    setFixed(Boolean(task?.fixedStart && task?.fixedEnd));
    setFixedStart(task?.fixedStart ?? "10:00");
    setFixedEnd(task?.fixedEnd ?? "11:00");
    setExamDate(task?.examDate ?? "");
    setRecurring(task?.recurring ?? false);
    setShowTaskForm(true);
  }
  function saveTask(e: FormEvent) {
    e.preventDefault();
    if (!taskName.trim() || !Number(duration) || taskDays.length === 0) return;
    const task: Task = {
      id: editingTask?.id ?? uid(),
      name: taskName.trim(),
      duration: Number(duration),
      stars,
      splittable,
      minChunk: Number(minChunk) || 30,
      dayTypes: taskDays,
      taskType,
      ...(!fixed ? { earliest, latest } : {}),
      ...(fixed ? { fixedStart, fixedEnd } : {}),
      ...(examDate ? { examDate } : {}),
      recurring,
      enabled: true,
    };
    setTasks((prev) =>
      editingTask
        ? prev.map((t) => (t.id === editingTask.id ? task : t))
        : [...prev, task],
    );
    setShowTaskForm(false);
    setNotice(
      editingTask
        ? "Task updated. Shuffle to refresh its placement."
        : "Task added. Shuffle your day to place it.",
    );
  }
  function toggleDone(session: PlannedSession) {
    const nextStatus = session.status === "done" ? "planned" : "done";
    setSchedules((prev) => ({
      ...prev,
      [today]: (prev[today] ?? []).map((s) =>
        s.id === session.id ? { ...s, status: nextStatus } : s,
      ),
    }));
    if (nextStatus === "done") {
      setCompletedIds((prev) =>
        prev.includes(session.id) ? prev : [...prev, session.id],
      );
      setActivity((prev) => ({ ...prev, [today]: (prev[today] ?? 0) + 1 }));
      setNotice(
        `${session.taskName} marked complete. Nice, that's time well spent.`,
      );
    }
  }

  function markMissed(session: PlannedSession) {
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const upcoming = (schedules[today] ?? []).filter(
      (s) =>
        s.start > nowMinutes &&
        s.start > session.start &&
        s.status === "planned",
    );

    const recovery = recoverMissedTask({
      missed: { ...session, status: "missed" },
      upcoming,
      tasks,
      today,
    });

    const replacementSessions: PlannedSession[] = recovery.replacedIds.flatMap(
      (id) => {
        const candidate = upcoming.find((s) => s.id === id);
        if (!candidate) return [];

        return [
          {
            ...candidate,
            id: `${session.taskId}-recovery-${candidate.id}`,
            taskId: session.taskId,
            taskName: session.taskName,
            stars: session.stars,
            taskType: session.taskType,
            fixed: false,
            status: "planned" as const,
          },
        ];
      },
    );

    setSchedules((prev) => ({
      ...prev,
      [today]: (prev[today] ?? [])
        .filter((s) => !recovery.replacedIds.includes(s.id))
        .map((s) =>
          s.id === session.id ? { ...s, status: "missed" as const } : s,
        )
        .concat(replacementSessions)
        .sort((a, b) => a.start - b.start),
    }));

    setNotice(recovery.reason);
  }

  function startFocus(session?: PlannedSession) {
    if (session) {
      setActiveSession(session);
      setTimerMode("focus");
      setRemaining(timerDuration);
    } else if (timerMode === "focus") {
      setRemaining(timerDuration);
    }
    setRunning(true);
    setTimerStartedAt(Date.now());
    setNotice(
      session
        ? `Focus started: ${session.taskName}`
        : timerMode === "focus"
          ? "Focus session started. One thing at a time."
          : "Stopwatch started.",
    );
  }
  function pauseTimer() {
    setRunning(false);
    setTimerStartedAt(null);
  }
  function resetTimer() {
    setRunning(false);
    setRemaining(timerDuration);
    setElapsed(0);
    setTimerStartedAt(null);
  }
  function finishTimer() {
    setRunning(false);
    const mins =
      timerMode === "focus"
        ? Math.round((timerDuration - remaining) / 60)
        : Math.round(elapsed / 60);
    if (mins > 0) {
      setActivity((prev) => ({ ...prev, [today]: (prev[today] ?? 0) + 1 }));
      setNotice(`${mins} focused minute${mins === 1 ? "" : "s"} recorded.`);
    }
    setRemaining(timerDuration);
    setElapsed(0);
    setTimerStartedAt(null);
  }
  const timeDisplay = (n: number) =>
    `${String(Math.floor(Math.max(0, n) / 3600)).padStart(2, "0")}:${String(Math.floor((Math.max(0, n) % 3600) / 60)).padStart(2, "0")}:${String(Math.max(0, n) % 60).padStart(2, "0")}`;
  const timerSeconds = timerMode === "focus" ? remaining : elapsed;
  const timerProgress =
    timerMode === "focus"
      ? Math.max(0, Math.min(100, (1 - remaining / timerDuration) * 100))
      : Math.min(100, (elapsed / 3600) * 100);
  const todayTasks = generated ? currentSchedule : [];
  const hours = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const heatmap = useMemo(() => {
    const cells: { date: string; count: number }[] = [];
    const end = new Date();
    for (let i = 139; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      cells.push({ date: key, count: activity[key] ?? 0 });
    }
    return cells;
  }, [activity]);
  function addClass(e: FormEvent) {
    e.preventDefault();
    const start = toMinutes(cStart);
    const end = toMinutes(cEnd);
    if (!cName.trim() || end <= start) {
      setNotice("A class needs a name and an end time after the start time.");
      return;
    }
    setClasses((p) => [
      ...p,
      { id: uid(), name: cName.trim(), day: cDay, start, end, attend: cAttend },
    ]);
    setCName("");
    setNotice("Class added. Shuffle on a college day to see it respected.");
  }

  function toggleAttend(id: string) {
    setClasses((p) =>
      p.map((c) => (c.id === id ? { ...c, attend: !c.attend } : c)),
    );
  }

  function removeClass(id: string) {
    setClasses((p) => p.filter((c) => c.id !== id));
  }
  function addChallenge(e: FormEvent) {
    e.preventDefault();
    const total = Number(chDays);
    if (!chName.trim() || !total || total < 1) {
      setNotice("A challenge needs a name and at least 1 day.");
      return;
    }
    setChallenges((p) => [
      ...p,
      {
        id: uid(),
        name: chName.trim(),
        startDate: today,
        totalDays: total,
        mode: chMode,
      },
    ]);
    setChName("");
    setNotice("Challenge started. Day 1 is today.");
  }

  function removeChallenge(id: string) {
    setChallenges((p) => p.filter((c) => c.id !== id));
  }
  function addBlock(e: FormEvent) {
    e.preventDefault();
    const start = toMinutes(bStart);
    const end = toMinutes(bEnd);
    if (!bName.trim() || end <= start) {
      setNotice(
        "A blocked period needs a name and an end time after the start time.",
      );
      return;
    }
    setBlocks((p) => ({
      ...p,
      [bDay]: [...(p[bDay] ?? []), { start, end, name: bName.trim() }],
    }));
    setBName("");
    setNotice("Blocked time added. Shuffle to apply it.");
  }

  function removeBlock(day: string, index: number) {
    setBlocks((p) => ({
      ...p,
      [day]: (p[day] ?? []).filter((_, i) => i !== index),
    }));
  }
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={19} />
          </div>
          <div>
            <div className="brand-name">
              worthwhile<span>.</span>
            </div>
            <div className="brand-tag">make today count</div>
          </div>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav className="nav-list">
          {[
            { label: "Today", icon: CalendarDays },
            { label: "My tasks", icon: ListTodo },
            { label: "Focus room", icon: AlarmClock },
            { label: "Activity", icon: Activity },
            { label: "Timetable", icon: Clock3 },
            { label: "Challenges", icon: Sparkles },
          ].map((item) => (
            <button
              key={item.label}
              className={`nav-item ${activeNav === item.label ? "active" : ""}`}
              onClick={() => setActiveNav(item.label)}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
              {item.label === "My tasks" && (
                <span className="nav-count">
                  {tasks.filter((t) => t.enabled).length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-mini-card">
            <div className="mini-orb">
              <Moon size={17} />
            </div>
            <div>
              <strong>A little goes a long way.</strong>
              <p>You don't have to do it all today.</p>
            </div>
          </div>
          <button
            className="profile-button"
            onClick={() =>
              setNotice(
                "Your preferences are saved in this browser for now. Cloud sync can come later.",
              )
            }
          >
            <div className="avatar">W</div>
            <div className="profile-copy">
              <strong>Your space</strong>
              <span>Personal planner</span>
            </div>
            <MoreHorizontal size={17} />
          </button>
        </div>
      </aside>
      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <strong>{activeNav}</strong>
          </div>
          <div className="topbar-right">
            <div className="today-chip">
              <span className="status-dot" />
              {dateLabel()}
            </div>
            <button
              className="icon-button"
              aria-label="Help"
              onClick={() =>
                setNotice(
                  "Pick a day type, shuffle your schedule, then start a focus session. Your data is saved in this browser.",
                )
              }
            >
              <CircleHelp size={18} />
            </button>
            <div className="avatar avatar-small">W</div>
          </div>
        </header>
        <div className="content-wrap">
          {activeNav === "Challenges" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">KEEP GOING</div>
                  <h2>Your challenges</h2>
                </div>
              </div>
              <form
                onSubmit={addChallenge}
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  margin: "12px 0",
                }}
              >
                <input
                  value={chName}
                  onChange={(e) => setChName(e.target.value)}
                  placeholder="e.g. DSA challenge"
                />
                <input
                  type="number"
                  value={chDays}
                  onChange={(e) => setChDays(e.target.value)}
                  style={{ width: 80 }}
                />
                <select
                  value={chMode}
                  onChange={(e) => setChMode(e.target.value as "up" | "down")}
                >
                  <option value="up">Count up</option>
                  <option value="down">Count down</option>
                </select>
                <button className="button button-primary" type="submit">
                  Start challenge
                </button>
              </form>
              {challenges.map((c) => {
                const st = challengeStatus(c, today);
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      padding: "6px 0",
                    }}
                  >
                    <span style={{ flex: 1 }}>
                      {c.name} · {st.big} {st.small}
                    </span>
                    <button
                      type="button"
                      className="button button-small button-secondary"
                      onClick={() => removeChallenge(c.id)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </section>
          )}
          {activeNav === "Timetable" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">COLLEGE</div>
                  <h2>Weekly timetable</h2>
                </div>
              </div>
              <p className="subtle-note">
                Attending = blocked. Skipping = free for self-study on college
                days.
              </p>
              <form
                onSubmit={addClass}
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  margin: "12px 0",
                }}
              >
                <input
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="Class name"
                />
                <select
                  value={cDay}
                  onChange={(e) => setCDay(Number(e.target.value))}
                >
                  {weekdayNames.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={cStart}
                  onChange={(e) => setCStart(e.target.value)}
                />
                <input
                  type="time"
                  value={cEnd}
                  onChange={(e) => setCEnd(e.target.value)}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={cAttend}
                    onChange={(e) => setCAttend(e.target.checked)}
                  />{" "}
                  I attend
                </label>
                <button className="button button-primary" type="submit">
                  Add class
                </button>
              </form>
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const list = classes
                  .filter((c) => c.day === d)
                  .sort((a, b) => a.start - b.start);
                if (!list.length) return null;
                return (
                  <div key={d} style={{ marginBottom: 12 }}>
                    <strong>{weekdayNames[d]}</strong>
                    {list.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          padding: "6px 0",
                        }}
                      >
                        <span style={{ flex: 1 }}>
                          {c.name} · {prettyTime(c.start)}–{prettyTime(c.end)}
                        </span>
                        <button
                          type="button"
                          className="button button-small button-secondary"
                          onClick={() => toggleAttend(c.id)}
                        >
                          {c.attend ? "Attending" : "Skipping"}
                        </button>
                        <button
                          type="button"
                          className="button button-small button-secondary"
                          onClick={() => removeClass(c.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </section>
          )}
          {activeNav === "Timetable" && (
            <section className="panel" style={{ marginTop: 16 }}>
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">ROUTINE</div>
                  <h2>Blocked time</h2>
                </div>
              </div>
              <p className="subtle-note">
                Commute, meals, bath, dinner. Nothing gets scheduled here.
              </p>
              <form
                onSubmit={addBlock}
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  margin: "12px 0",
                }}
              >
                <input
                  value={bName}
                  onChange={(e) => setBName(e.target.value)}
                  placeholder="e.g. Dinner"
                />
                <select
                  value={bDay}
                  onChange={(e) => setBDay(e.target.value as DayType)}
                >
                  {(["college", "home", "holiday", "custom"] as DayType[]).map(
                    (d) => (
                      <option key={d} value={d}>
                        {dayLabels[d]}
                      </option>
                    ),
                  )}
                </select>
                <input
                  type="time"
                  value={bStart}
                  onChange={(e) => setBStart(e.target.value)}
                />
                <input
                  type="time"
                  value={bEnd}
                  onChange={(e) => setBEnd(e.target.value)}
                />
                <button className="button button-primary" type="submit">
                  Add
                </button>
              </form>
              {(["college", "home", "holiday", "custom"] as DayType[]).map(
                (d) => {
                  const list = blocks[d] ?? [];
                  if (!list.length) return null;
                  return (
                    <div key={d} style={{ marginBottom: 12 }}>
                      <strong>{dayLabels[d]}</strong>
                      {list.map((b, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            padding: "6px 0",
                          }}
                        >
                          <span style={{ flex: 1 }}>
                            {b.name} · {prettyTime(b.start)}–{prettyTime(b.end)}
                          </span>
                          <button
                            type="button"
                            className="button button-small button-secondary"
                            onClick={() => removeBlock(d, i)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                },
              )}
            </section>
          )}
          {activeNav === "Today" && (
            <>
              {challenges.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 16,
                  }}
                >
                  {challenges.map((c) => {
                    const st = challengeStatus(c, today);
                    return (
                      <div
                        key={c.id}
                        className="panel"
                        style={{ padding: 16, minWidth: 180 }}
                      >
                        <div className="section-kicker">
                          {c.name.toUpperCase()}
                        </div>
                        <div
                          style={{
                            fontSize: 40,
                            fontWeight: 700,
                            color: "var(--purple)",
                          }}
                        >
                          {st.big}
                        </div>
                        <div className="subtle-note">{st.small}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <section className="welcome-row">
                <div>
                  <div className="eyebrow">
                    <span className="eyebrow-line" /> YOUR DAY, YOUR WAY
                  </div>
                  <h1>
                    Make room for <span>what matters.</span>
                  </h1>
                  <p className="welcome-sub">
                    A little direction. A little surprise. A day that feels like
                    yours.
                  </p>
                </div>
                <button
                  className="button button-primary shuffle-top"
                  onClick={() => shuffleSchedule(true)}
                >
                  <Shuffle size={16} /> Shuffle my day
                </button>
              </section>
              <section className="daytype-panel">
                <div className="panel-intro">
                  <div>
                    <div className="section-kicker">SET THE SCENE</div>
                    <h2>What kind of day is it?</h2>
                  </div>
                  <span className="subtle-note">
                    Your schedule adapts to this.
                  </span>
                </div>
                <div className="daytype-grid">
                  {(["college", "home", "holiday", "custom"] as DayType[]).map(
                    (type) => {
                      const Icon = dayIcons[type];
                      return (
                        <button
                          key={type}
                          className={`daytype-card ${selectedDay === type ? "selected" : ""}`}
                          onClick={() => {
                            setSelectedDay(type);
                            setNotice(
                              `${dayLabels[type]} selected. Shuffle to generate a schedule for this day.`,
                            );
                          }}
                        >
                          <div className="daytype-icon">
                            <Icon size={19} />
                          </div>
                          <div className="daytype-copy">
                            <strong>{dayLabels[type]}</strong>
                            <span>
                              {
                                (
                                  {
                                    college: "Classes & commute",
                                    home: "Your everyday rhythm",
                                    holiday: "More room to explore",
                                    custom: "Make it your own",
                                  } as Record<DayType, string>
                                )[type]
                              }
                            </span>
                          </div>
                          <span className="select-ring">
                            {selectedDay === type && <span />}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </section>
              <div className="dashboard-grid">
                <div className="left-column">
                  <section className="panel schedule-panel">
                    <div className="panel-heading">
                      <div>
                        <div className="section-kicker">YOUR PLAN</div>
                        <h2>
                          Today's flow{" "}
                          <span className="live-pill">
                            <span /> {generated ? "READY" : "NOT GENERATED"}
                          </span>
                        </h2>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => setShowAllTasks((v) => !v)}
                      >
                        {showAllTasks ? "Hide task list" : "Manage tasks"}{" "}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    {!generated ? (
                      <div className="empty-schedule">
                        <div className="empty-art">
                          <div className="empty-orbit orbit-one" />
                          <div className="empty-orbit orbit-two" />
                          <div className="empty-icon">
                            <Sparkles size={25} />
                          </div>
                        </div>
                        <h3>Your day is a blank canvas.</h3>
                        <p>
                          Choose your day type, then let Worthwhile find a
                          rhythm that works.
                        </p>
                        <button
                          className="button button-primary"
                          onClick={() => shuffleSchedule()}
                        >
                          <Shuffle size={15} /> Build today's schedule
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="schedule-meta">
                          <span>
                            <CalendarDays size={14} /> {dayLabels[selectedDay]}
                          </span>
                          <span>
                            <Clock3 size={14} /> {planned.length} upcoming
                            sessions
                          </span>
                          <button
                            className="tiny-action"
                            onClick={() => shuffleSchedule(true)}
                            title="Reshuffle"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                        <div className="timeline">
                          {todayTasks.length === 0 && (
                            <div className="empty-small">
                              No sessions yet. Add tasks or try another day
                              type.
                            </div>
                          )}
                          {todayTasks.map((session, i) => (
                            <div
                              className={`timeline-row ${session.status === "done" ? "is-done" : ""} ${session.status === "missed" ? "is-missed" : ""}`}
                              key={session.id}
                            >
                              <div className="time-col">
                                <span>{prettyTime(session.start)}</span>
                                <small>{prettyTime(session.end)}</small>
                              </div>
                              <div
                                className={`timeline-track ${session.fixed ? "fixed-track" : ""}`}
                              >
                                <span
                                  className={`timeline-dot type-${session.taskType}`}
                                />
                                <div
                                  className={`session-card type-card-${session.taskType}`}
                                >
                                  <div className="session-main">
                                    <div className="session-title-row">
                                      <strong>{session.taskName}</strong>
                                      {session.fixed && (
                                        <span className="fixed-label">
                                          FIXED
                                        </span>
                                      )}
                                    </div>
                                    <div className="session-details">
                                      <span>
                                        <Clock3 size={12} />
                                        {fmtDuration(
                                          session.end - session.start,
                                        )}
                                      </span>
                                      {session.stars > 0 && (
                                        <Stars value={session.stars} small />
                                      )}
                                    </div>
                                  </div>
                                  <div className="session-actions">
                                    {session.status === "done" ? (
                                      <span className="done-label">
                                        <Check size={14} /> Done
                                      </span>
                                    ) : session.status === "missed" ? (
                                      <span className="missed-label">
                                        Missed
                                      </span>
                                    ) : session.taskType === "class" ? null : (
                                      <>
                                        <button
                                          className="session-icon-action"
                                          title="Start focus"
                                          onClick={() => startFocus(session)}
                                        >
                                          <Play size={13} />
                                        </button>
                                        <button
                                          className="session-icon-action"
                                          title="Mark complete"
                                          onClick={() => toggleDone(session)}
                                        >
                                          <Check size={14} />
                                        </button>
                                        {!session.fixed && (
                                          <button
                                            className="session-icon-action muted-action"
                                            title="Mark missed"
                                            onClick={() => markMissed(session)}
                                          >
                                            <SkipForward size={13} />
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {(schedules[today] ?? []).some(
                          (s) => s.status === "missed",
                        ) && (
                          <div className="recovery-note">
                            <RefreshCw size={15} />
                            <div>
                              <strong>Recovery is part of the plan.</strong>
                              <p>
                                Missed sessions are considered against
                                lower-priority upcoming tasks.
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {showAllTasks && (
                      <div className="task-manager">
                        <div className="task-manager-head">
                          <h3>Tasks in your world</h3>
                          <button
                            className="button button-small button-secondary"
                            onClick={() => openNewTask()}
                          >
                            <Plus size={14} /> Add task
                          </button>
                        </div>
                        {tasks
                          .filter((t) => t.enabled)
                          .map((t) => (
                            <button
                              className="manage-task-row"
                              key={t.id}
                              onClick={() => openNewTask(t)}
                            >
                              <span className="manage-task-name">{t.name}</span>
                              <Stars value={t.stars} small />
                              <span className="manage-duration">
                                {fmtDuration(t.duration)}
                              </span>
                              <ArrowRight size={14} />
                            </button>
                          ))}
                      </div>
                    )}
                  </section>
                  <section className="panel activity-panel">
                    <div className="panel-heading">
                      <div>
                        <div className="section-kicker">SHOWING UP COUNTS</div>
                        <h2>Your activity</h2>
                      </div>
                      <span className="activity-total">
                        <strong>
                          {Object.values(activity).reduce((a, b) => a + b, 0)}
                        </strong>{" "}
                        sessions logged
                      </span>
                    </div>
                    <div className="heatmap-head">
                      <span>Less</span>
                      <div className="heat-legend">
                        {[0, 1, 2, 3, 4].map((n) => (
                          <i key={n} className={`heat-cell heat-${n}`} />
                        ))}
                      </div>
                      <span>More</span>
                    </div>
                    <div className="heatmap-wrap">
                      <div className="weekday-labels">
                        {hours.map((d, i) => (
                          <span key={d}>{i % 2 === 0 ? d : ""}</span>
                        ))}
                      </div>
                      <div className="heatmap-grid">
                        {heatmap.map((cell) => (
                          <div
                            key={cell.date}
                            title={`${cell.date}: ${cell.count} session${cell.count === 1 ? "" : "s"}`}
                            className={`heat-cell heat-${Math.min(4, cell.count)} ${cell.date === today ? "heat-today" : ""}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="activity-footer">
                      <span>
                        <Sparkles size={13} /> Every session adds up. No
                        streaks, no pressure.
                      </span>
                      <button
                        className="text-button"
                        onClick={() => setActiveNav("Activity")}
                      >
                        View history <ArrowRight size={13} />
                      </button>
                    </div>
                  </section>
                </div>
                <div className="right-column">
                  <section className="focus-card">
                    <div className="focus-card-top">
                      <div>
                        <div className="focus-kicker">
                          <span /> FOCUS ROOM
                        </div>
                        <h2>Find your flow.</h2>
                      </div>
                      <button
                        className="focus-menu"
                        onClick={() => {
                          setTimerMode((v) =>
                            v === "focus" ? "stopwatch" : "focus",
                          );
                          setRunning(false);
                        }}
                        title="Switch timer mode"
                      >
                        <ArrowDownUp size={16} />
                      </button>
                    </div>
                    <div className="timer-tabs">
                      <button
                        className={timerMode === "focus" ? "tab-active" : ""}
                        onClick={() => {
                          setTimerMode("focus");
                          setRunning(false);
                        }}
                      >
                        Focus timer
                      </button>
                      <button
                        className={
                          timerMode === "stopwatch" ? "tab-active" : ""
                        }
                        onClick={() => {
                          setTimerMode("stopwatch");
                          setRunning(false);
                        }}
                      >
                        Stopwatch
                      </button>
                    </div>
                    <div className="timer-ring-wrap">
                      <svg
                        className="timer-ring"
                        viewBox="0 0 220 220"
                        aria-label="Focus timer progress"
                      >
                        <circle
                          cx="110"
                          cy="110"
                          r="94"
                          className="ring-track"
                        />
                        <circle
                          cx="110"
                          cy="110"
                          r="94"
                          className="ring-progress"
                          style={{
                            strokeDasharray: 590.6,
                            strokeDashoffset:
                              590.6 - (590.6 * timerProgress) / 100,
                          }}
                        />
                      </svg>
                      <div className="timer-center">
                        <span className="timer-state">
                          {running
                            ? "IN SESSION"
                            : timerMode === "focus"
                              ? "READY TO FOCUS"
                              : "STOPWATCH"}
                        </span>
                        <strong>{timeDisplay(timerSeconds)}</strong>
                        <span className="timer-caption">
                          {running
                            ? "You are doing enough. Keep going."
                            : timerMode === "focus"
                              ? "One thing at a time."
                              : "Track time as it passes."}
                        </span>
                      </div>
                    </div>
                    <div className="timer-presets">
                      {[15, 25, 45, 60].map((n) => (
                        <button
                          key={n}
                          className={
                            timerDuration === n * 60 ? "preset-active" : ""
                          }
                          onClick={() => {
                            setTimerDuration(n * 60);
                            setRemaining(n * 60);
                            setRunning(false);
                            setTimerMode("focus");
                          }}
                        >
                          {n} min
                        </button>
                      ))}
                    </div>
                    <div className="timer-controls">
                      <button
                        className="button button-primary timer-main-button"
                        onClick={() => (running ? pauseTimer() : startFocus())}
                      >
                        {running ? (
                          <>
                            <Pause size={16} /> Pause session
                          </>
                        ) : (
                          <>
                            <Play size={16} fill="currentColor" />{" "}
                            {timerSeconds === timerDuration ||
                            timerMode === "stopwatch"
                              ? "Start focusing"
                              : "Resume focus"}
                          </>
                        )}
                      </button>
                      <button
                        className="timer-reset"
                        onClick={resetTimer}
                        title="Reset timer"
                      >
                        <TimerReset size={17} />
                      </button>
                      {running && (
                        <button
                          className="timer-reset"
                          onClick={finishTimer}
                          title="Finish session"
                        >
                          <Check size={17} />
                        </button>
                      )}
                    </div>
                    <div className="focus-footnote">
                      <Coffee size={14} />
                      <span>Rest is part of the rhythm, too.</span>
                    </div>
                  </section>
                  <section className="panel next-up-panel">
                    <div className="panel-heading compact-heading">
                      <div>
                        <div className="section-kicker">A GENTLE NUDGE</div>
                        <h2>Up next</h2>
                      </div>
                      <div className="next-spark">
                        <Sparkles size={16} />
                      </div>
                    </div>
                    {nextSession ? (
                      <div className="next-session">
                        <div
                          className={`next-icon type-card-${nextSession.taskType}`}
                        >
                          {nextSession.taskType === "study" ? (
                            <Sparkles size={18} />
                          ) : nextSession.taskType === "class" ? (
                            <GraduationCap size={18} />
                          ) : (
                            <Coffee size={18} />
                          )}
                        </div>
                        <div className="next-copy">
                          <strong>{nextSession.taskName}</strong>
                          <span>
                            {prettyTime(nextSession.start)} ·{" "}
                            {fmtDuration(nextSession.end - nextSession.start)}
                          </span>
                        </div>
                        <button
                          className="next-play"
                          onClick={() => startFocus(nextSession)}
                        >
                          <Play size={14} fill="currentColor" />
                        </button>
                      </div>
                    ) : (
                      <div className="next-empty">
                        <span className="next-icon">
                          <Check size={18} />
                        </span>
                        <div>
                          <strong>No next session yet</strong>
                          <span>Shuffle your day to find your rhythm.</span>
                        </div>
                      </div>
                    )}
                    <div className="next-divider" />
                    <div className="small-stat-row">
                      <div>
                        <span>Planned today</span>
                        <strong>
                          {fmtDuration(
                            planned.reduce((a, s) => a + s.end - s.start, 0),
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Completed</span>
                        <strong>{fmtDuration(totalFocus)}</strong>
                      </div>
                    </div>
                  </section>
                  <section className="quote-card">
                    <div className="quote-mark">“</div>
                    <p>
                      You don't need to have it all figured out. Just make the
                      next little moment worthwhile.
                    </p>
                    <div className="quote-bottom">
                      <span>YOUR REMINDER</span>
                      <span className="quote-spark">
                        <Sparkles size={15} />
                      </span>
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}
          {activeNav === "My tasks" && (
            <section className="panel full-page-panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">YOUR PERSONAL LIBRARY</div>
                  <h2>Tasks in your world</h2>
                  <p className="panel-subtitle">
                    No topics or complicated hierarchies. Just the things you
                    want to make time for.
                  </p>
                </div>
                <button
                  className="button button-primary"
                  onClick={() => openNewTask()}
                >
                  <Plus size={16} /> Add task
                </button>
              </div>
              <div className="all-tasks-list">
                {tasks
                  .filter((t) => t.enabled)
                  .map((t) => (
                    <div className="all-task-row" key={t.id}>
                      <div className={`task-type-icon type-card-${t.taskType}`}>
                        {t.taskType === "study" ? (
                          <Sparkles size={17} />
                        ) : t.taskType === "class" ? (
                          <GraduationCap size={17} />
                        ) : t.taskType === "hobby" ? (
                          <Sun size={17} />
                        ) : (
                          <Clock3 size={17} />
                        )}
                      </div>
                      <div className="all-task-main">
                        <strong>{t.name}</strong>
                        <span>
                          {fmtDuration(t.duration)} ·{" "}
                          {t.splittable
                            ? "Can be split"
                            : "One continuous session"}{" "}
                          · {t.dayTypes.map((d) => dayLabels[d]).join(", ")}
                        </span>
                      </div>
                      <Stars value={t.stars} />
                      <button
                        className="icon-button"
                        onClick={() => openNewTask(t)}
                      >
                        <Settings2 size={16} />
                      </button>
                      <button
                        className="icon-button danger-hover"
                        onClick={() => {
                          setTasks((prev) => prev.filter((x) => x.id !== t.id));
                          setNotice(`${t.name} removed.`);
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
              </div>
            </section>
          )}
          {activeNav === "Focus room" && (
            <section className="focus-page">
              <div className="eyebrow">
                <span className="eyebrow-line" /> YOUR SPACE TO FOCUS
              </div>
              <h1>
                One thing at a time<span>.</span>
              </h1>
              <p className="welcome-sub">
                No pressure to do everything. Just be here for this session.
              </p>
              <div className="focus-page-card">
                {/* timer is shared with the Today dashboard */}
                <div className="focus-page-ring">
                  <div className="timer-state">
                    {running ? "IN SESSION" : "READY"}
                  </div>
                  <strong>{timeDisplay(timerSeconds)}</strong>
                  <span>
                    {timerMode === "focus" ? "Focus timer" : "Stopwatch"}
                  </span>
                </div>
                <div className="timer-presets">
                  {[15, 25, 45, 60].map((n) => (
                    <button
                      key={n}
                      className={
                        timerDuration === n * 60 ? "preset-active" : ""
                      }
                      onClick={() => {
                        setTimerDuration(n * 60);
                        setRemaining(n * 60);
                        setRunning(false);
                        setTimerMode("focus");
                      }}
                    >
                      {n} min
                    </button>
                  ))}
                </div>
                <div className="timer-controls">
                  <button
                    className="button button-primary timer-main-button"
                    onClick={() => (running ? pauseTimer() : startFocus())}
                  >
                    {running ? (
                      <>
                        <Pause size={16} /> Pause session
                      </>
                    ) : (
                      <>
                        <Play size={16} /> Start focusing
                      </>
                    )}
                  </button>
                  <button className="timer-reset" onClick={resetTimer}>
                    <TimerReset size={17} />
                  </button>
                </div>
              </div>
            </section>
          )}
          {activeNav === "Activity" && (
            <section className="panel full-page-panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">YOUR TIME, ACKNOWLEDGED</div>
                  <h2>Every little bit counts.</h2>
                  <p className="panel-subtitle">
                    A quiet record of showing up. No streaks, no guilt.
                  </p>
                </div>
                <div className="activity-number">
                  <strong>
                    {Object.values(activity).reduce((a, b) => a + b, 0)}
                  </strong>
                  <span>sessions logged</span>
                </div>
              </div>
              <div className="heatmap-head">
                <span>Less</span>
                <div className="heat-legend">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <i key={n} className={`heat-cell heat-${n}`} />
                  ))}
                </div>
                <span>More</span>
              </div>
              <div className="heatmap-grid large-heatmap">
                {heatmap.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${cell.count} session${cell.count === 1 ? "" : "s"}`}
                    className={`heat-cell heat-${Math.min(4, cell.count)} ${cell.date === today ? "heat-today" : ""}`}
                  />
                ))}
              </div>
              <div className="activity-footer">
                <span>
                  <Sparkles size={13} /> You are allowed to begin again every
                  day.
                </span>
              </div>
            </section>
          )}
          <footer className="app-footer">
            <span>WORTHWHILE © 2026</span>
            <span>
              Make space for what matters{" "}
              <span className="footer-heart">✳</span>
            </span>
          </footer>
        </div>
      </section>
      {showTaskForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowTaskForm(false);
          }}
        >
          <form className="task-modal" onSubmit={saveTask}>
            <div className="modal-heading">
              <div>
                <div className="section-kicker">BUILD YOUR DAY</div>
                <h2>{editingTask ? "Edit task" : "Add a task"}</h2>
                <p>Keep it simple. You can always change it later.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowTaskForm(false)}
              >
                <X size={18} />
              </button>
            </div>
            <label className="field-label">
              Task name
              <input
                required
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g. Development, DSA, make a drink"
              />
            </label>
            <div className="form-two-col">
              <label className="field-label">
                Duration (minutes)
                <input
                  required
                  min="5"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </label>
              <label className="field-label">
                Task type
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as TaskType)}
                >
                  <option value="study">Study</option>
                  <option value="class">Class / commitment</option>
                  <option value="routine">Routine</option>
                  <option value="hobby">Hobby</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <div className="field-label">
              Priority{" "}
              <span className="field-hint">
                Higher stars get considered first
              </span>
              <div className="star-picker">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={stars === n ? "star-choice chosen" : ""}
                    onClick={() => setStars(n)}
                  >
                    {n === 0 ? (
                      "0"
                    ) : (
                      <>
                        <Star
                          size={16}
                          fill={n <= stars ? "currentColor" : "none"}
                        />
                        {n}
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="field-label">
              Available on
              <div className="day-checkboxes">
                {(["college", "home", "holiday", "custom"] as DayType[]).map(
                  (d) => (
                    <label
                      key={d}
                      className={`day-check ${taskDays.includes(d) ? "checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={taskDays.includes(d)}
                        onChange={(e) =>
                          setTaskDays((prev) =>
                            e.target.checked
                              ? [...prev, d]
                              : prev.filter((x) => x !== d),
                          )
                        }
                      />
                      {dayLabels[d]}
                    </label>
                  ),
                )}
              </div>
            </div>
            <div className="form-two-col">
              <label className="field-label">
                Earliest start
                <input
                  type="time"
                  value={earliest}
                  onChange={(e) => setEarliest(e.target.value)}
                  disabled={fixed}
                />
              </label>
              <label className="field-label">
                Latest finish
                <input
                  type="time"
                  value={latest}
                  onChange={(e) => setLatest(e.target.value)}
                  disabled={fixed}
                />
              </label>
            </div>
            <label className="toggle-line">
              <span>
                <strong>Splittable task</strong>
                <small>Allow the scheduler to divide it into chunks.</small>
              </span>
              <input
                type="checkbox"
                checked={splittable}
                onChange={(e) => setSplittable(e.target.checked)}
              />
            </label>
            {splittable && (
              <label className="field-label">
                Minimum chunk (minutes)
                <input
                  type="number"
                  min="5"
                  value={minChunk}
                  onChange={(e) => setMinChunk(e.target.value)}
                />
              </label>
            )}
            <label className="toggle-line">
              <span>
                <strong>Fixed-time commitment</strong>
                <small>Reserve a specific time and prevent overlap.</small>
              </span>
              <input
                type="checkbox"
                checked={fixed}
                onChange={(e) => setFixed(e.target.checked)}
              />
            </label>
            {fixed && (
              <div className="form-two-col">
                <label className="field-label">
                  Starts at
                  <input
                    type="time"
                    value={fixedStart}
                    onChange={(e) => setFixedStart(e.target.value)}
                  />
                </label>
                <label className="field-label">
                  Ends at
                  <input
                    type="time"
                    value={fixedEnd}
                    onChange={(e) => setFixedEnd(e.target.value)}
                  />
                </label>
              </div>
            )}
            <label className="field-label">
              Exam / deadline date <span className="field-hint">Optional</span>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </label>
            <label className="toggle-line">
              <span>
                <strong>Recurring task</strong>
                <small>Something you regularly need to do.</small>
              </span>
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setShowTaskForm(false)}
              >
                Cancel
              </button>
              <button className="button button-primary" type="submit">
                <Check size={15} />
                {editingTask ? "Save changes" : "Add task"}
              </button>
            </div>
          </form>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Sparkles size={16} />
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}
    </main>
  );
}
