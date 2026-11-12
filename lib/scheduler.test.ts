import { describe, expect, it } from "vitest";
import {
  generateSchedule,
  effectivePriority,
  recoverMissedTask,
  type Task,
} from "./scheduler";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "dsa",
  name: "DSA",
  duration: 60,
  stars: 3,
  splittable: false,
  minChunk: 30,
  dayTypes: ["home"],
  taskType: "study",
  recurring: true,
  enabled: true,
  ...overrides,
});

describe("Worthwhile scheduler", () => {
  it("does not schedule a task inside blocked time", () => {
    const result = generateSchedule({
      tasks: [makeTask({ earliest: "09:00", latest: "12:00" })],
      dayType: "home",
      today: "2026-10-19",
      blocks: [{ start: 9 * 60, end: 10 * 60, name: "Breakfast" }],
      seed: 1,
    });

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].start).toBe(10 * 60);
    expect(result.sessions[0].end).toBe(11 * 60);
  });

  it("reports a fixed task that overlaps blocked time", () => {
    const result = generateSchedule({
      tasks: [
        makeTask({
          fixedStart: "09:00",
          fixedEnd: "10:00",
        }),
      ],
      dayType: "home",
      today: "2026-10-19",
      blocks: [{ start: 9 * 60 + 30, end: 10 * 60 + 30, name: "Travel" }],
    });

    expect(result.sessions).toHaveLength(0);
    expect(result.conflicts).toHaveLength(1);
  });

  it("avoids overlapping flexible sessions", () => {
    const result = generateSchedule({
      tasks: [
        makeTask({ id: "a", name: "DSA", earliest: "09:00", latest: "12:00" }),
        makeTask({
          id: "b",
          name: "Development",
          earliest: "09:00",
          latest: "12:00",
        }),
      ],
      dayType: "home",
      today: "2026-10-19",
      blocks: [],
      seed: 1,
    });

    const [first, second] = result.sessions;

    expect(first.end).toBeLessThanOrEqual(second.start);
  });

  it("keeps a final chunk above the minimum when possible", () => {
    const result = generateSchedule({
      tasks: [
        makeTask({
          duration: 65,
          splittable: true,
          minChunk: 30,
          earliest: "09:00",
          latest: "11:00",
        }),
      ],
      dayType: "home",
      today: "2026-10-19",
      blocks: [],
      seed: 1,
    });

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].end - result.sessions[0].start).toBe(65);
    expect(result.unplaced).toHaveLength(0);
  });

  it("boosts priority as an exam approaches", () => {
    const task = makeTask({
      stars: 2,
      examDate: "2026-10-20",
    });

    expect(effectivePriority(task, "2026-10-19")).toBe(30);
  });

  it("does not reschedule a fully completed task", () => {
    const completed = {
      id: "done-1",
      taskId: "dsa",
      taskName: "DSA",
      start: 9 * 60,
      end: 10 * 60,
      stars: 3,
      taskType: "study" as const,
      fixed: false,
      status: "done" as const,
    };

    const result = generateSchedule({
      tasks: [makeTask({ duration: 60 })],
      dayType: "home",
      today: "2026-10-19",
      blocks: [],
      existing: [completed],
      seed: 1,
    });

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].status).toBe("done");
    expect(result.unplaced).toHaveLength(0);
  });

  it("reports overlapping fixed commitments", () => {
    const result = generateSchedule({
      tasks: [
        makeTask({
          id: "class-a",
          name: "Class A",
          taskType: "class",
          fixedStart: "10:00",
          fixedEnd: "11:00",
        }),
        makeTask({
          id: "class-b",
          name: "Class B",
          taskType: "class",
          fixedStart: "10:30",
          fixedEnd: "11:30",
        }),
      ],
      dayType: "home",
      today: "2026-10-19",
      blocks: [],
    });

    expect(result.sessions).toHaveLength(1);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toContain("Class B");
  });

  it("chooses a lower-priority session for recovery", () => {
    const missed = {
      id: "missed-dsa",
      taskId: "dsa",
      taskName: "DSA",
      start: 9 * 60,
      end: 10 * 60,
      stars: 3,
      taskType: "study" as const,
      fixed: false,
      status: "missed" as const,
    };

    const upcoming = {
      id: "hobby-session",
      taskId: "hobby",
      taskName: "Chess",
      start: 11 * 60,
      end: 12 * 60,
      stars: 0,
      taskType: "hobby" as const,
      fixed: false,
      status: "planned" as const,
    };

    const result = recoverMissedTask({
      missed,
      upcoming: [upcoming],
      tasks: [
        makeTask({ id: "dsa", stars: 3 }),
        makeTask({ id: "hobby", name: "Chess", stars: 0, taskType: "hobby" }),
      ],
      today: "2026-10-19",
    });

    expect(result.replacedId).toBe("hobby-session");
  });

  it("never replaces a fixed commitment during recovery", () => {
    const missed = {
      id: "missed-dsa",
      taskId: "dsa",
      taskName: "DSA",
      start: 9 * 60,
      end: 10 * 60,
      stars: 3,
      taskType: "study" as const,
      fixed: false,
      status: "missed" as const,
    };

    const fixedClass = {
      id: "class-session",
      taskId: "class",
      taskName: "Class",
      start: 11 * 60,
      end: 12 * 60,
      stars: 0,
      taskType: "class" as const,
      fixed: true,
      status: "planned" as const,
    };

    const result = recoverMissedTask({
      missed,
      upcoming: [fixedClass],
      tasks: [
        makeTask({ id: "dsa", stars: 3 }),
        makeTask({ id: "class", name: "Class", stars: 0, taskType: "class" }),
      ],
      today: "2026-10-19",
    });

    expect(result.replacedId).toBeNull();
  });

  it("recovers a 60-minute missed task using two 30-minute sessions", () => {
    const missed = {
      id: "missed-dsa",
      taskId: "dsa",
      taskName: "DSA",
      start: 9 * 60,
      end: 10 * 60,
      stars: 3,
      taskType: "study" as const,
      fixed: false,
      status: "missed" as const,
    };

    const dev = {
      id: "dev-session",
      taskId: "dev",
      taskName: "Development",
      start: 11 * 60,
      end: 11 * 60 + 30,
      stars: 2,
      taskType: "study" as const,
      fixed: false,
      status: "planned" as const,
    };

    const chess = {
      id: "chess-session",
      taskId: "chess",
      taskName: "Chess",
      start: 12 * 60,
      end: 12 * 60 + 30,
      stars: 1,
      taskType: "hobby" as const,
      fixed: false,
      status: "planned" as const,
    };

    const result = recoverMissedTask({
      missed,
      upcoming: [dev, chess],
      tasks: [
        makeTask({ id: "dsa", stars: 3, splittable: true }),
        makeTask({ id: "dev", name: "Development", stars: 2 }),
        makeTask({
          id: "chess",
          name: "Chess",
          stars: 1,
          taskType: "hobby",
        }),
      ],
      today: "2026-10-19",
    });

    expect(result.replacedIds).toEqual(["chess-session", "dev-session"]);
    expect(result.recoveryMinutes).toBe(60);
  });

  it("recovers partially when only 30 eligible minutes are available", () => {
    const missed = {
      id: "missed-dsa",
      taskId: "dsa",
      taskName: "DSA",
      start: 9 * 60,
      end: 10 * 60,
      stars: 3,
      taskType: "study" as const,
      fixed: false,
      status: "missed" as const,
    };

    const dev = {
      id: "dev-session",
      taskId: "dev",
      taskName: "Development",
      start: 11 * 60,
      end: 11 * 60 + 30,
      stars: 2,
      taskType: "study" as const,
      fixed: false,
      status: "planned" as const,
    };

    const result = recoverMissedTask({
      missed,
      upcoming: [dev],
      tasks: [
        makeTask({ id: "dsa", stars: 3, splittable: true }),
        makeTask({ id: "dev", name: "Development", stars: 2 }),
      ],
      today: "2026-10-19",
    });

    expect(result.replacedIds).toEqual(["dev-session"]);
    expect(result.recoveryMinutes).toBe(30);
    expect(result.reason).toContain("remaining 30 minutes");
  });

  it("does not replace a session with equal priority", () => {
    const missed = {
      id: "missed-dsa",
      taskId: "dsa",
      taskName: "DSA",
      start: 9 * 60,
      end: 10 * 60,
      stars: 3,
      taskType: "study" as const,
      fixed: false,
      status: "missed" as const,
    };

    const dev = {
      id: "dev-session",
      taskId: "dev",
      taskName: "Development",
      start: 11 * 60,
      end: 12 * 60,
      stars: 3,
      taskType: "study" as const,
      fixed: false,
      status: "planned" as const,
    };

    const result = recoverMissedTask({
      missed,
      upcoming: [dev],
      tasks: [
        makeTask({ id: "dsa", stars: 3 }),
        makeTask({ id: "dev", name: "Development", stars: 3 }),
      ],
      today: "2026-10-19",
    });

    expect(result.replacedIds).toEqual([]);
    expect(result.replacedId).toBeNull();
    expect(result.recoveryMinutes).toBe(0);
  });
  it("keeps a task inside its allowed time window", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const result = generateSchedule({
        tasks: [makeTask({ earliest: "07:00", latest: "12:00" })],
        dayType: "home",
        today: "2026-10-19",
        blocks: [],
        seed,
      });
      for (const s of result.sessions) {
        expect(s.start).toBeGreaterThanOrEqual(7 * 60);
        expect(s.end).toBeLessThanOrEqual(12 * 60);
      }
    }
  });

  it("reports a non-splittable task that cannot fit", () => {
    const result = generateSchedule({
      tasks: [makeTask({ duration: 90, earliest: "09:00", latest: "10:00" })],
      dayType: "home",
      today: "2026-10-19",
      blocks: [],
      seed: 1,
    });
    expect(result.sessions).toHaveLength(0);
    expect(result.unplaced).toHaveLength(1);
  });

  it("ignores tasks that are not allowed on this day type", () => {
    const result = generateSchedule({
      tasks: [makeTask({ dayTypes: ["college"] })],
      dayType: "home",
      today: "2026-10-19",
      blocks: [],
      seed: 1,
    });
    expect(result.sessions).toHaveLength(0);
  });
});
("");
