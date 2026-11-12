# Worthwhile 💜

A personal study scheduler built around controlled randomness, realistic constraints, and focus sessions. Worthwhile helps you make room for what matters without locking you into the same rigid timetable every day.

## Current MVP

- Day types: College, Home, Holiday, Custom
- Flat task model with 0–5 star priority
- Fixed-time commitments and blocked periods
- Splittable / non-splittable tasks
- Allowed day types and eligible time windows
- Exam-date priority boost
- Daily randomised schedule generation
- Missed-session replacement helper
- Focus countdown timer and stopwatch mode
- Session completion and activity heatmap
- Browser-local persistence
- Responsive midnight-purple UI with neon violet and lime accents

## Run locally

Requirements: Node.js 20+

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build

```bash
npm run build
```

## Deployment

### Vercel
1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Keep the default Next.js build settings.
4. Deploy.

### Netlify
1. Push this repository to GitHub.
2. Import the repository into Netlify.
3. Use the Next.js runtime/plugin and deploy.

## Current limitations / next milestones

- Data is stored in the current browser only. Clearing site data can remove it.
- Authentication and cloud sync are not included yet.
- College timetable entry is currently through task records; a dedicated weekly timetable editor is a next milestone.
- The first scheduler uses a simple priority-first placement strategy. Complex packing cases and overnight tasks need more tests before relying on it for a critical exam plan.
- Recovery helper selects a lower-priority upcoming flexible session; full replacement re-planning and preserving original sessions will be strengthened in the next milestone.
- Timer is a browser-side timer. Long background/suspended-tab behavior should be verified before treating it as a precision stopwatch.

## Architecture

- `app/page.tsx`: interactive dashboard and task editor
- `app/globals.css`: responsive UI and theme
- `lib/scheduler.ts`: scheduling rules, priority score, and recovery selection

The scheduling engine is deliberately separate from React so it can be tested independently.
