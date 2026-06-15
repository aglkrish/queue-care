# Thought Process — QueueCure '26

This document explains the design decisions, trade-offs, and reasoning behind the implementation, with a focus on concurrency and edge cases as required by the evaluation criteria.

---

## 1. Core Design Goal

The single most important requirement was: **both screens update instantly via WebSockets, without refresh, and wait times must be computed dynamically — never hardcoded.**

This drove the architecture toward a "single source of truth" model:

- The backend owns the canonical queue state (MongoDB).
- Every mutation (add patient, call next, complete, remove, update average time) recomputes the **full** queue state on the server and broadcasts it via the `queueState` Socket.IO event, in addition to a specific named event (`patientAdded`, `callNext`, etc.).
- The frontend's `useQueue` hook listens to `queueState` as the primary sync mechanism, and uses the named events only to trigger toast notifications.

This avoids a class of bugs where the frontend tries to "patch" its local state based on partial event payloads and drifts out of sync with the backend over time. Instead, every state update is a fresh, authoritative snapshot.

---

## 2. Token Generation Strategy

Tokens follow the `A001`, `A002`, ... format. Two competing approaches were considered:

1. **Derive token from count of documents** (e.g. `A` + count + 1) — simple, but breaks if patients are removed (counts shift) and is not safe under concurrent inserts.
2. **Atomic counter in a `Settings` document, incremented via `$inc`** — chosen approach. MongoDB's `findOneAndUpdate` with `$inc` is atomic at the document level, so even if two receptionists add a patient at the exact same millisecond, each gets a unique, sequential token with no duplicates.

Additionally:
- Tokens reset daily (tracked via `lastResetDate`), so each clinic day starts at `A001`.
- If more than 999 patients are registered in a single day, the prefix rolls over (`A999` → `B001`), keeping the token format consistent and short.
- A separate, strictly monotonic `sequence` field (independent of the display token) is used internally for FIFO ordering. This decouples "what the token looks like" from "what order patients should be served in," which matters across prefix rollovers.

---

## 3. Concurrency: Preventing Duplicate "Call Next" Clicks (Edge Case 2)

This was the trickiest requirement. Two receptionists clicking "Call Next" within milliseconds of each other must not both advance the queue — only one patient should move to `in-consultation`.

**Two layers of defense were implemented:**

1. **Application-level lock (`utils/lock.js`)**: A simple in-memory async mutex (`AsyncLock`) wraps the entire "Call Next" operation (`callNextLock.runExclusive(...)`). Since Node.js runs on a single event loop per process, this guarantees that the "complete current → find next → claim next" sequence runs as one atomic unit relative to other requests on the same server instance. Concurrent requests queue up and are processed strictly one at a time.

2. **Database-level atomicity (defense in depth)**: Even within the lock, the "claim the next patient" step uses `Patient.findOneAndUpdate({ status: 'waiting' }, { $set: { status: 'in-consultation', ... } }, { sort: { sequence: 1 } })`. This is a single atomic MongoDB operation — even if the in-memory lock were somehow bypassed (e.g. a future multi-instance deployment), the database itself prevents two processes from both claiming the same "waiting" patient, because `findOneAndUpdate` is atomic per document.

**Trade-off acknowledged**: the in-memory lock only works correctly for a single server instance. The README explicitly documents that horizontal scaling would require a distributed lock (e.g. Redis). For a hackathon-scale clinic deployment (one Render instance), this is the right trade-off between correctness and complexity.

---

## 4. Wait Time Calculation — Never Hardcoded

`estimatedWaitMinutes = patientsAhead × averageConsultationTime` is computed fresh, every time, inside `utils/queueHelpers.js -> getQueueState()`. It is never stored in the database. This guarantees:

- If the receptionist changes the average consultation time, **every** waiting patient's estimated wait updates immediately on the next broadcast — no stale cached values.
- If a patient is removed or completes, everyone behind them in the queue automatically gets a shorter wait, because `patientsAhead` is recalculated from the live `waitingList` array (using `.map((p, index) => ...)`).

---

## 5. Browser Refresh & Persistence (Edge Case 3)

All state lives in MongoDB (`Patient` and `Settings` collections). On mount, `useQueue` calls `GET /api/patients/queue-state` via REST **before** the socket connection necessarily completes. This ensures:

- A receptionist who refreshes mid-shift sees the exact current queue, not an empty state.
- The patient display screen, if left running on a TV/monitor that gets power-cycled, recovers its state on reboot.

The Socket.IO connection then takes over for live updates. If the socket connects after the REST fetch, the server's `queueState` push on `connection` simply re-confirms (or updates) the same data.

---

## 6. Socket Reconnection (Edge Case 4)

`socket.io-client` is configured with `reconnection: true` and `reconnectionAttempts: Infinity`. On the server side, `socketHandler.js` sends a full `queueState` snapshot to **every** new connection — including reconnections. This means:

- A patient display that loses Wi-Fi for 30 seconds will, upon reconnecting, immediately receive the current state — it doesn't need to "catch up" on missed events, because it gets the full picture at once.
- The frontend also exposes a `requestSync` event the client can emit manually as an extra safety net, and shows a toast ("Reconnected to server. Queue synced.") so receptionists have visibility into connection health.

---

## 7. Large Queue Performance (Edge Case 5)

For 1000+ patients:

- `Patient` schema has a compound index on `{ status: 1, sequence: 1 }`, so fetching "all waiting patients in order" is an index-only scan, not a full collection scan.
- The `GET /api/patients` endpoint supports pagination (`?page=`, `?limit=`, capped at 1000) so the receptionist table doesn't try to render unbounded rows at once — the `QueueTable` component also paginates client-side (10 rows/page) with search filtering on top.
- `getQueueState()` computes `waitingList` with a single `.map()` over the waiting patients — O(n) — which was benchmarked at ~3ms for 1000 patients in the logic simulation used during development.

---

## 8. Why a Single `queueState` Event (vs. Many Granular Events)

An alternative design would have each named event (`patientAdded`, `callNext`, etc.) carry enough data for the frontend to surgically update its local list. This was rejected because:

- It multiplies the surface area for state-drift bugs (e.g. what if `patientAdded` fires but the client missed a prior `patientRemoved`?).
- The queue's derived fields (`position`, `estimatedWaitMinutes`, `totalWaiting`, `servedToday`) depend on the *entire* waiting list and settings — they can't be computed from a single event's payload anyway.

Instead, named events are kept lightweight and are used purely for **UX feedback** (toast notifications), while `queueState` is the single source of truth for **rendering**. This is simpler to reason about and trivially correct under reconnection.

---

## 9. UI/UX Decisions

- **Color palette** was fixed per the brief (`#2563EB` primary, `#1E293B` secondary, `#10B981` success) and extended into full Tailwind shade scales so hover/dark-mode variants stay visually consistent.
- **Patient Waiting Room Display** uses a large gradient hero card for the current token with a "pop" animation (`animate-token-pop`, keyed by `currentToken` so it replays on every change) — designed to be readable from across a waiting room.
- **Dark mode** is implemented via Tailwind's `class` strategy and persisted to `localStorage`, falling back to the OS preference on first visit.
- **Toasts** cover all required notifications: "No patients in queue", patient added/called/completed/removed, average time updates, and connection status changes.

---

## 10. What Was Deliberately Kept Simple (and Why)

- **Soft deletes for "removed" patients** (`status: 'removed'`) rather than hard deletes — preserves audit trail and CSV export history without extra complexity.
- **No authentication** — out of scope per the brief; the app assumes a single trusted clinic-internal network. A production version would add receptionist login (JWT) before exposing mutation endpoints.
- **In-memory lock instead of Redis** — appropriate for a single-instance hackathon deployment; documented as a known scaling limitation rather than over-engineered upfront.
