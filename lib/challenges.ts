export type Challenge = {
  id: string;
  name: string;
  startDate: string; // "YYYY-MM-DD"
  totalDays: number;
  mode: "up" | "down";
};

const stamp = (s: string) => new Date(`${s}T12:00:00`).getTime();

export function challengeStatus(c: Challenge, today: string) {
  const n = Math.round((stamp(today) - stamp(c.startDate)) / 86400000) + 1;
  if (n < 1) {
    return { big: "Soon", small: `Starts in ${1 - n} day(s)` };
  }
  if (n > c.totalDays) {
    return { big: "Done", small: `${c.totalDays}-day challenge complete` };
  }
  return c.mode === "up"
    ? { big: `Day ${n}`, small: `of ${c.totalDays}` }
    : {
        big: `Day ${c.totalDays - n + 1}`,
        small: `of ${c.totalDays} · counting down`,
      };
}
