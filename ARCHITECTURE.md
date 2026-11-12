# Worthwhile: implementation map

## Milestone 1 — Core scheduler and UI (current)
- [x] Choose product name and visual direction
- [x] Flat task model (no topic hierarchy)
- [x] Day-type selection
- [x] Stars from 0–5
- [x] Fixed commitments and flexible time windows
- [x] Splittable task support
- [x] Basic exam urgency boost
- [x] Randomised ordering for comparable tasks
- [x] Dashboard, task editor, focus timer, heatmap
- [x] Browser persistence
- [ ] Add automated scheduler tests
- [ ] Validate build and resolve any issues

## Milestone 2 — Scheduler correctness
- [ ] Formalise effective-priority and exam-boost weights
- [ ] Add feasibility tests for overlapping blocks, duration, and splitting
- [ ] Improve placement with bounded backtracking when greedy placement fails
- [ ] Implement full missed-session replacement/recovery and carry-forward
- [ ] Add manual shuffle of unstarted sessions without changing completed/fixed sessions
- [ ] Reconcile fixed task duration with its start/end times
- [ ] Handle overnight and timezone edge cases

## Milestone 3 — Personalisation
- [ ] Dedicated weekly college timetable editor
- [ ] Mark each lecture as attended (blocked) or available for self-study
- [ ] Shared routine templates across day types
- [ ] Custom availability and one-off commitments
- [ ] Daily study capacity and buffer-time settings
- [ ] Import/export personal data as JSON

## Milestone 4 — Persistence and deployment
- [ ] Choose local-first vs cloud account experience
- [ ] Add Supabase/Postgres and authentication only if multi-device sync is needed
- [ ] Ensure strict per-user data isolation
- [ ] Add error states and empty states
- [ ] Add production timer persistence / elapsed-time calculations
- [ ] Deploy preview to Vercel
- [ ] Add screenshots, feature list, architecture notes, and demo GIF to README

## Milestone 5 — Portfolio polish
- [ ] Unit tests and scheduling invariant tests
- [ ] Accessibility and keyboard navigation pass
- [ ] Mobile responsive QA
- [ ] Performance and dependency review
- [ ] LinkedIn project description and demo screenshots

## Scheduler invariants
1. No two planned sessions overlap.
2. No flexible task overlaps a blocked window.
3. Fixed commitments remain at their specified times.
4. Non-splittable tasks are assigned as one continuous session.
5. Splittable chunks respect the configured minimum except when the remaining duration is smaller than that minimum.
6. Every generated session refers to an existing task.
7. A reshuffle preserves completed sessions and fixed commitments.
8. Unplaced work is reported; it is never silently treated as completed.
