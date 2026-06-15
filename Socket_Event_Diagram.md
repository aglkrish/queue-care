# Socket Event Diagram — QueueCure '26

This document describes every Socket.IO event used in QueueCure '26, including direction, trigger, payload shape, and which UI components react to it.

---

## 1. Event Summary Table

| Event Name | Direction | Triggered By | Payload |
|---|---|---|---|
| `connect` | Server → Client (lifecycle) | New connection or reconnection | — |
| `queueState` | Server → Client | On connect/reconnect, and after every mutation | `{ currentToken, currentPatient, waitingList, averageConsultationTime, totalWaiting, servedToday }` |
| `patientAdded` | Server → Client | `POST /api/patients` | `{ token, name }` |
| `callNext` | Server → Client | `POST /api/patients/call-next` | `{ currentToken }` |
| `patientCompleted` | Server → Client | Call Next (auto-complete previous) or `PATCH /:id/complete` | `{ token, name }` |
| `patientRemoved` | Server → Client | `DELETE /api/patients/:id` | `{ token, name }` |
| `averageTimeUpdated` | Server → Client | `PUT /api/settings/average-time` | `{ averageConsultationTime }` |
| `requestSync` | Client → Server | Client requests fresh state (e.g. after reconnect) | — (no payload) |
| `disconnect` | Server → Client (lifecycle) | Connection drop | `reason: string` |

---

## 2. Full Connection Lifecycle Diagram

```
┌──────────────┐                                  ┌──────────────┐
│  Client       │                                  │  Server       │
│ (Receptionist │                                  │ (Socket.IO)   │
│  or Display)  │                                  │               │
└──────┬───────┘                                  └──────┬───────┘
       │                                                  │
       │ ── WebSocket handshake ──────────────────────► │
       │                                                  │
       │ ◄──────────────── 'connect' ────────────────── │
       │                                                  │
       │ ◄──────────────── 'queueState' ──────────────── │  (initial full sync)
       │     { currentToken, waitingList, ... }          │
       │                                                  │
       │  ... user adds a patient via REST POST ...       │
       │                                                  │
       │ ◄──────────────── 'patientAdded' ─────────────── │  { token: "A015", name: "John" }
       │ ◄──────────────── 'queueState' ──────────────── │  (recomputed full state)
       │                                                  │
       │  ... receptionist clicks "Call Next" ...          │
       │                                                  │
       │ ◄──────────────── 'patientCompleted' ─────────── │  { token: "A014", name: "Jane" } (if applicable)
       │ ◄──────────────── 'callNext' ────────────────── │  { currentToken: "A015" }
       │ ◄──────────────── 'queueState' ──────────────── │  (recomputed full state)
       │                                                  │
       │  ... network drop ...                            │
       │ ✕ ─────────────── 'disconnect' ───────────────── │
       │                                                  │
       │  ... network restored, socket.io-client          │
       │      auto-reconnects ...                          │
       │                                                  │
       │ ── WebSocket handshake ──────────────────────► │
       │ ◄──────────────── 'connect' ────────────────── │
       │ ◄──────────────── 'queueState' ──────────────── │  (full resync — Edge Case 4)
       │                                                  │
       │ ── 'requestSync' (optional, defense-in-depth) ─► │
       │ ◄──────────────── 'queueState' ──────────────── │
       │                                                  │
```

---

## 3. Event-to-UI Mapping

### `queueState`
- **Receptionist Dashboard**: updates stat cards (Current Token, Patients Waiting, Served Today), queue table re-renders with new `waitingList`/`currentToken`.
- **Patient Waiting Room Display**: updates the large "Now Serving" card, the stats row, and the grid of waiting tokens with recalculated wait times.
- **Analytics**: triggers a re-fetch of `/api/analytics` when `servedToday` or `totalWaiting` changes.

### `patientAdded`
- Toast: `"New patient added: A015 - John"`

### `callNext`
- Toast: `"Now serving token A015"`
- Patient Display's "Now Serving" card replays its pop-in animation (keyed by `currentToken`).

### `patientCompleted`
- Toast: `"Consultation completed: A014"`

### `patientRemoved`
- Toast: `"Patient removed: A013 - Jane"`

### `averageTimeUpdated`
- Toast: `"Average consultation time updated to 12 min"`
- Triggers `queueState` immediately after, so all wait times recalculate.

### `disconnect` / reconnect
- Navbar connection indicator switches from "Live" (green, pulsing) to "Reconnecting..." (red).
- On reconnect: toast `"Reconnected to server. Queue synced."`

---

## 4. Payload Schema Reference

### `queueState`
```json
{
  "currentToken": "A015",
  "currentPatient": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0d",
    "token": "A015",
    "name": "John Doe",
    "age": 34,
    "phone": "9876543210",
    "status": "in-consultation",
    "joinTime": "2026-06-14T05:10:00.000Z",
    "consultationStartTime": "2026-06-14T05:30:00.000Z",
    "consultationEndTime": null
  },
  "waitingList": [
    {
      "_id": "665f1a2b3c4d5e6f7a8b9c0e",
      "token": "A016",
      "name": "Jane Smith",
      "age": 28,
      "phone": "9876543211",
      "joinTime": "2026-06-14T05:15:00.000Z",
      "status": "waiting",
      "position": 1,
      "patientsAhead": 0,
      "estimatedWaitMinutes": 0
    }
  ],
  "averageConsultationTime": 10,
  "totalWaiting": 1,
  "servedToday": 14
}
```

### `patientAdded`
```json
{ "token": "A016", "name": "Jane Smith" }
```

### `callNext`
```json
{ "currentToken": "A015" }
```

### `patientCompleted`
```json
{ "token": "A014", "name": "Previous Patient" }
```

### `patientRemoved`
```json
{ "token": "A013", "name": "Removed Patient" }
```

### `averageTimeUpdated`
```json
{ "averageConsultationTime": 12 }
```
