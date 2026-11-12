export type DayType = "college" | "home" | "holiday" | "custom";
export type TaskType = "study" | "class" | "routine" | "hobby" | "other";
export type Task = {
  id: string;
  name: string;
  duration: number;
  stars: number;
  splittable: boolean;
  minChunk: number;
  dayTypes: DayType[];
  taskType: TaskType;
  fixedStart?: string;
  fixedEnd?: string;
  earliest?: string;
  latest?: string;
  recurring: boolean;
  examDate?: string;
  enabled: boolean;
};
export type PlannedSession = {
  id: string;
  taskId: string;
  taskName: string;
  start: number;
  end: number;
  stars: number;
  taskType: TaskType;
  fixed: boolean;
  status: "planned" | "done" | "missed";
};
export type ScheduleResult = {
  sessions: PlannedSession[];
  unplaced: string[];
  conflicts: string[];
};
export type Block = { start: number; end: number; name: string };
export type ClassSlot = {
  id: string;
  name: string;
  day: number;
  start: number;
  end: number;
  attend: boolean;
};

export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export const toTime = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
export const prettyTime = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
const intersects = (a: number, b: number, c: number, d: number) =>
  a < d && c < b;

function examBoost(task: Task, today: string) {
  if (!task.examDate) return 0;
  const days = Math.ceil(
    (new Date(`${task.examDate}T12:00:00`).getTime() -
      new Date(`${today}T12:00:00`).getTime()) /
      86400000,
  );
  if (days < 0) return 0;
  if (days <= 1) return 5;
  if (days <= 3) return 4;
  if (days <= 7) return 3;
  if (days <= 14) return 2;
  if (days <= 30) return 1;
  return 0;
}
export const effectivePriority = (task: Task, today: string) =>
  task.stars * 10 + examBoost(task, today) * 2;

function isFree(
  start: number,
  end: number,
  sessions: PlannedSession[],
  blocks: Block[],
) {
  return (
    !sessions.some((s) => intersects(start, end, s.start, s.end)) &&
    !blocks.some((b) => intersects(start, end, b.start, b.end))
  );
}

/** A small, deterministic-by-seed scheduler: fixed commitments first, then high-priority tasks.
 * It honours hard time windows, task durations, and explicit splitting rules. */
export function generateSchedule(args: {
  tasks: Task[];
  dayType: DayType;
  today: string;
  blocks: Block[];
  existing?: PlannedSession[];
  seed?: number;
}): ScheduleResult {
  const { tasks, dayType, today, blocks } = args;
  let seed = args.seed ?? Date.now();
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const sessions: PlannedSession[] = [...(args.existing ?? [])];
  const unplaced: string[] = [];
  const conflicts: string[] = [];
  const eligible = tasks.filter(
    (t) => t.enabled && t.dayTypes.includes(dayType),
  );
  const fixed = eligible
    .filter((t) => t.fixedStart && t.fixedEnd)
    .sort((a, b) => toMinutes(a.fixedStart!) - toMinutes(b.fixedStart!));
  for (const task of fixed) {
    const start = toMinutes(task.fixedStart!);
    const end = toMinutes(task.fixedEnd!);
    if (end <= start) {
      conflicts.push(`${task.name}: end time must be after start time.`);
      continue;
    }
    if (blocks.some((b) => intersects(start, end, b.start, b.end))) {
      conflicts.push(`${task.name}: overlaps an unavailable period.`);
      continue;
    }
    if (sessions.some((s) => s.taskId === task.id)) continue;
    if (!isFree(start, end, sessions, [])) {
      conflicts.push(`${task.name}: overlaps another scheduled task.`);
      continue;
    }
    sessions.push({
      id: `${task.id}-${start}`,
      taskId: task.id,
      taskName: task.name,
      start,
      end,
      stars: task.stars,
      taskType: task.taskType,
      fixed: true,
      status: "planned",
    });
  }
  const flexible = eligible
    .filter((t) => !(t.fixedStart && t.fixedEnd))
    .map((t) => {
      const completed = sessions
        .filter((s) => s.taskId === t.id && s.status === "done")
        .reduce((sum, s) => sum + (s.end - s.start), 0);
      return { ...t, duration: Math.max(0, t.duration - completed) };
    })
    .filter((t) => t.duration > 0);
  // Fisher–Yates shuffle first to avoid permanent tie order, then sort by effective priority.
  for (let i = flexible.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [flexible[i], flexible[j]] = [flexible[j], flexible[i]];
  }
  flexible.sort(
    (a, b) => effectivePriority(b, today) - effectivePriority(a, today),
  );
  for (const task of flexible) {
    let remaining = task.duration;
    const earliest = task.earliest ? toMinutes(task.earliest) : 7 * 60;
    const latest = task.latest ? toMinutes(task.latest) : 23 * 60;
    const minChunk = task.splittable
      ? Math.max(5, task.minChunk || 30)
      : task.duration;
    let guard = 0;
    while (remaining > 0 && guard++ < 50) {
      let needed = task.splittable
        ? Math.min(remaining, Math.max(minChunk, Math.min(remaining, 60)))
        : remaining;

      // Avoid leaving a final chunk smaller than the minimum.
      if (
        task.splittable &&
        remaining > needed &&
        remaining - needed < minChunk
      ) {
        needed = remaining;
      }
      let found = -1;
      for (let start = earliest; start + needed <= latest; start += 5) {
        if (isFree(start, start + needed, sessions, blocks)) {
          found = start;
          break;
        }
      }
      if (found < 0) break;
      sessions.push({
        id: `${task.id}-${found}-${sessions.length}`,
        taskId: task.id,
        taskName: task.name,
        start: found,
        end: found + needed,
        stars: task.stars,
        taskType: task.taskType,
        fixed: false,
        status: "planned",
      });
      remaining -= needed;
      if (!task.splittable) break;
    }
    if (remaining > 0)
      unplaced.push(`${task.name} (${remaining} min remaining)`);
  }
  sessions.sort((a, b) => a.start - b.start);
  return { sessions, unplaced, conflicts };
}

export function recoverMissedTask(args: {
  missed: PlannedSession;
  upcoming: PlannedSession[];
  tasks: Task[];
  today: string;
}) {
  const { missed, upcoming, tasks, today } = args;
  const missedTask = tasks.find((t) => t.id === missed.taskId);
  const missedDuration = missed.end - missed.start;

  const result = (
    replacedIds: string[],
    recoveryMinutes: number,
    reason: string,
  ) => ({
    replacedId: replacedIds[0] ?? null,
    replacedIds,
    recoveryMinutes,
    reason,
  });

  if (!missedTask || missedTask.stars === 0) {
    return result([], 0, "Zero-star tasks can be reconsidered tomorrow.");
  }

  const candidates = upcoming
    .filter((s) => !s.fixed && s.status === "planned")
    .map((session) => ({
      session,
      task: tasks.find((t) => t.id === session.taskId),
    }))
    .filter((item): item is { session: PlannedSession; task: Task } =>
      Boolean(
        item.task &&
        item.session.taskId !== missed.taskId &&
        effectivePriority(item.task, today) <
          effectivePriority(missedTask, today),
      ),
    )
    .sort(
      (a, b) =>
        effectivePriority(a.task, today) - effectivePriority(b.task, today) ||
        a.session.start - b.session.start,
    );

  // An unsplittable task needs one sufficiently long replacement slot.
  if (!missedTask.splittable) {
    const candidate = candidates.find(
      (item) => item.session.end - item.session.start >= missedDuration,
    );

    if (!candidate) {
      return result(
        [],
        0,
        "No suitable single session is available; carry this task forward.",
      );
    }

    return result(
      [candidate.session.id],
      missedDuration,
      `Recovery scheduled by replacing ${candidate.session.taskName}.`,
    );
  }

  // A splittable task can use several smaller sessions.
  // Never select a session that would make recovery exceed the missed duration.
  const selected: string[] = [];
  let recoveryMinutes = 0;

  for (const candidate of candidates) {
    const duration = candidate.session.end - candidate.session.start;

    if (duration <= 0 || recoveryMinutes + duration > missedDuration) {
      continue;
    }

    selected.push(candidate.session.id);
    recoveryMinutes += duration;

    if (recoveryMinutes === missedDuration) break;
  }

  if (selected.length === 0) {
    return result(
      [],
      0,
      "No lower-priority session can be used for recovery; carry this task forward.",
    );
  }

  if (recoveryMinutes === missedDuration) {
    return result(
      selected,
      recoveryMinutes,
      `Recovered all ${missedDuration} minutes using ${selected.length} session(s).`,
    );
  }

  return result(
    selected,
    recoveryMinutes,
    `Recovered ${recoveryMinutes} of ${missedDuration} minutes. Carry the remaining ${missedDuration - recoveryMinutes} minutes forward.`,
  );
}
