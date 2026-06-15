# QueueCure '26

A real-time clinic token queue management system that replaces paper tokens and manual patient calling with a synchronized digital experience for receptionists and patients.

Built for the **Queue Cure '26** hackathon hosted on [Wooble](https://wooble.io).

---

## 1. Project Overview

76% of India's 1.5 million clinics still rely on paper token slips, with patients waiting 2-3 hours without any visibility into their position in the queue. QueueCure '26 solves this with two synchronized real-time screens:

- **Receptionist Dashboard** — add patients, generate tokens automatically, call the next patient, manage consultation settings, and view live analytics.
- **Patient Waiting Room Display** — a large, hospital-style display showing the current token being served, queue position, and dynamically calculated estimated wait times.

Both screens update **instantly** via WebSockets (Socket.IO) — no page refresh required.

### Key Features

- Automatic sequential token generation (A001, A002, A003, ...)
- Real-time bi-directional sync between receptionist and patient screens
- Dynamic wait-time calculation: `estimated wait = patients ahead × average consultation time`
- Editable average consultation time, instantly reflected across all screens
- Persistent storage in MongoDB (queue survives refreshes and restarts)
- Backend locking to prevent duplicate "Call Next" actions from concurrent receptionists
- Automatic socket reconnection with full state resync
- Search by patient name or token
- CSV export of the queue
- Dark mode toggle
- Dashboard analytics with charts (patients served, average wait time, queue trend)
- Designed to scale to 1000+ patients in queue

---

## 2. Architecture Diagram

```
┌─────────────────────────┐                  ┌──────────────────────────┐
│   React Frontend (Vite)  │                  │   Node.js / Express API   │
│                          │   HTTP (REST)    │                          │
│  ┌────────────────────┐  │ ───────────────► │  Controllers              │
│  │ Receptionist        │  │                  │   - patientController     │
│  │ Dashboard           │  │ ◄─────────────── │   - settingsController    │
│  └────────────────────┘  │   JSON response   │   - analyticsController   │
│                          │                  │                          │
│  ┌────────────────────┐  │  WebSocket       │  ┌────────────────────┐  │
│  │ Patient Waiting     │◄─┼──────────────────┼──┤ Socket.IO Server    │  │
│  │ Room Display        │  │  (Socket.IO)     │  │  - patientAdded     │  │
│  └────────────────────┘  │ ───────────────► │  │  - callNext         │  │
│                          │                  │  │  - patientCompleted │  │
│  ┌────────────────────┐  │                  │  │  - averageTimeUpdated│ │
│  │ Analytics Dashboard │  │                  │  │  - queueState       │  │
│  └────────────────────┘  │                  │  └────────────────────┘  │
└─────────────────────────┘                  │             │             │
                                              │             ▼             │
                                              │  ┌────────────────────┐  │
                                              │  │   Mongoose Models   │  │
                                              │  │   - Patient         │  │
                                              │  │   - Settings        │  │
                                              │  └──────────┬─────────┘  │
                                              └─────────────┼────────────┘
                                                            ▼
                                                  ┌──────────────────┐
                                                  │     MongoDB       │
                                                  │  (Atlas / Local)  │
                                                  └──────────────────┘
```

### Request Flow Example: "Call Next"

1. Receptionist clicks **Call Next** → `POST /api/patients/call-next`
2. Backend acquires an in-memory async lock (prevents duplicate concurrent calls)
3. Current `in-consultation` patient (if any) → marked `completed`
4. First `waiting` patient (FIFO by `sequence`) → atomically marked `in-consultation`
5. Backend recomputes full queue state (wait times, stats)
6. Server emits `callNext`, `patientCompleted`, and `queueState` events via Socket.IO
7. All connected clients (receptionist + patient displays) update instantly

---

## 3. Setup Instructions

### Prerequisites

- Node.js >= 18
- MongoDB (local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)
- npm

### Clone & Install

```bash
git clone <your-repo-url>
cd queuecure

# Backend
cd server
npm install

# Frontend (in a new terminal)
cd ../client
npm install
```

### Configure Environment Variables

Copy the example env files and fill in your values (see [Environment Variables](#4-environment-variables) below):

```bash
# Backend
cd server
cp .env.example .env

# Frontend
cd ../client
cp .env.example .env
```

### Run Locally

```bash
# Terminal 1 - Backend (default port 5000)
cd server
npm run dev

# Terminal 2 - Frontend (default port 5173)
cd client
npm run dev
```

Open:
- Receptionist Dashboard: `http://localhost:5173/`
- Patient Waiting Room Display: `http://localhost:5173/display`
- Analytics: `http://localhost:5173/analytics`

---

## 4. Environment Variables

### Backend (`server/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the Express/Socket.IO server listens on | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/queuecure` |
| `CLIENT_ORIGIN` | Comma-separated list of allowed frontend origins (CORS + Socket.IO) | `http://localhost:5173,https://queuecure.vercel.app` |
| `NODE_ENV` | Environment mode | `development` / `production` |

### Frontend (`client/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend API/Socket.IO server | `http://localhost:5000` |

---

## 5. Socket Event Flow

See [`Socket_Event_Diagram.md`](./Socket_Event_Diagram.md) for the full diagram. Summary of events emitted by the server:

| Event | Trigger | Payload |
|---|---|---|
| `patientAdded` | New patient added to queue | `{ token, name }` |
| `callNext` | Receptionist calls next patient | `{ currentToken }` |
| `patientCompleted` | A patient's consultation is marked completed | `{ token, name }` |
| `patientRemoved` | A patient is removed from the queue | `{ token, name }` |
| `averageTimeUpdated` | Average consultation time changed | `{ averageConsultationTime }` |
| `queueState` | Full state sync — sent on connect, reconnect, and after every mutation | `{ currentToken, currentPatient, waitingList, averageConsultationTime, totalWaiting, servedToday }` |

Clients can also emit `requestSync` (no payload) to request an immediate `queueState` push — used as a defense-in-depth resync mechanism after reconnects.

---

## 6. API Documentation

Base URL: `http://localhost:5000` (or your deployed backend URL)

### Patients

| Method | Endpoint | Description | Body / Query |
|---|---|---|---|
| `GET` | `/api/patients` | List patients (excludes `removed` by default) | Query: `status`, `search`, `page`, `limit` |
| `GET` | `/api/patients/queue-state` | Full computed queue state | — |
| `GET` | `/api/patients/export` | Export queue as CSV | — |
| `POST` | `/api/patients` | Add a new patient (auto-generates token) | `{ name, age, phone }` |
| `POST` | `/api/patients/call-next` | Call the next waiting patient | — |
| `PATCH` | `/api/patients/:id/complete` | Mark a specific patient as completed | — |
| `DELETE` | `/api/patients/:id` | Remove a patient (soft delete) | — |

### Settings

| Method | Endpoint | Description | Body |
|---|---|---|---|
| `GET` | `/api/settings` | Get current clinic settings | — |
| `PUT` | `/api/settings/average-time` | Update average consultation time (minutes) | `{ averageConsultationTime }` |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics` | Aggregated stats for dashboard charts |

### Example: Add Patient

```bash
curl -X POST http://localhost:5000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "age": 34, "phone": "9876543210"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "A015",
    "name": "John Doe",
    "age": 34,
    "phone": "9876543210",
    "status": "waiting",
    "joinTime": "2026-06-14T05:30:00.000Z"
  },
  "queueState": { "...": "..." }
}
```

### Example: Call Next

```bash
curl -X POST http://localhost:5000/api/patients/call-next
```

Response (queue empty):
```json
{ "success": true, "empty": true, "message": "No patients in queue", "queueState": { "...": "..." } }
```

---

## 7. Edge Cases Handled

| # | Edge Case | How It's Handled |
|---|---|---|
| 1 | **Queue empty on Call Next** | Backend returns `{ empty: true, message: "No patients in queue" }`; frontend shows a toast notification. |
| 2 | **Multiple receptionists clicking Call Next simultaneously** | An in-memory async lock (`utils/lock.js`) serializes all "Call Next" operations. Additionally, the "claim next patient" step uses an atomic `findOneAndUpdate`, so only one patient can transition to `in-consultation` per click even under concurrent requests. |
| 3 | **Browser refresh** | All queue data is persisted in MongoDB. On mount, the frontend fetches `/api/patients/queue-state` via REST, so the queue never disappears. |
| 4 | **Socket reconnection** | `socket.io-client` auto-reconnects (infinite retries, capped backoff). On every `connect` event (including reconnects), the server immediately emits a full `queueState` event, and the client can also emit `requestSync` for an explicit resync. |
| 5 | **Very large queues (1000+ patients)** | Queue queries use indexed fields (`status`, `sequence`), paginated REST list endpoint (`?limit=`), and `estimatedWaitMinutes` is computed in a single pass over the waiting list — verified to handle 1000 patients in milliseconds. |

---

## 8. Deployment Guide

### Backend → Render

1. Push the `server/` directory to a GitHub repository (or use a monorepo with root directory set to `server`).
2. Create a new **Web Service** on [Render](https://render.com).
3. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `server` (if monorepo)
4. Add environment variables from `server/.env.example`:
   - `MONGO_URI` → your MongoDB Atlas connection string
   - `CLIENT_ORIGIN` → your deployed frontend URL (e.g. `https://queuecure.vercel.app`)
   - `PORT` → Render sets this automatically, but `5000` works as a fallback
5. Deploy. Note the resulting URL, e.g. `https://queuecure-api.onrender.com`.

### Frontend → Vercel

1. Push the `client/` directory to a GitHub repository (or use a monorepo with root directory set to `client`).
2. Import the project on [Vercel](https://vercel.com).
3. Set:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variable:
   - `VITE_API_URL` → your Render backend URL (e.g. `https://queuecure-api.onrender.com`)
5. Deploy.

### MongoDB → Atlas

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user and whitelist `0.0.0.0/0` (or Render's IPs) under Network Access.
3. Copy the connection string into `MONGO_URI` on Render.

### Post-Deployment Checklist

- [ ] Visit `https://<backend>.onrender.com/health` → should return `{ "success": true, "status": "ok" }`
- [ ] Visit `https://<frontend>.vercel.app/` → Receptionist Dashboard loads
- [ ] Add a test patient → token generated, appears in queue
- [ ] Open `/display` in another tab/device → confirm real-time sync
- [ ] Click "Call Next" → both screens update instantly

---

## 9. Final Deliverables

- ✅ Fully working **frontend** (React + Vite + Tailwind CSS + React Router)
- ✅ Fully working **backend** (Node.js + Express + Socket.IO)
- ✅ **MongoDB** integration (Mongoose models: `Patient`, `Settings`)
- ✅ **Socket.IO** integration (real-time bi-directional sync, reconnection handling)
- ✅ **Responsive UI** (mobile-friendly, dark mode, loading/empty states, toast notifications)
- ✅ `README.md` (this file)
- ✅ `Thought_Process.md`
- ✅ `Socket_Event_Diagram.md`

### Project Structure

```
queuecure/
├── client/
│   ├── src/
│   │   ├── components/   # AddPatientForm, QueueTable, SettingsPanel, Navbar, Feedback (toasts/badges/loading)
│   │   ├── pages/         # ReceptionistDashboard, PatientDisplay, Analytics
│   │   ├── hooks/          # useQueue (central real-time state hook)
│   │   ├── services/       # api.js (REST client)
│   │   ├── sockets/        # socket.js (Socket.IO client singleton)
│   │   └── context/        # ThemeContext (dark mode), ToastContext
│   └── ...
└── server/
    ├── controllers/    # patientController, settingsController, analyticsController
    ├── routes/         # patientRoutes, settingsRoutes, analyticsRoutes
    ├── models/         # Patient, Settings
    ├── middleware/      # errorHandler
    ├── sockets/         # events.js (event constants), socketHandler.js
    └── utils/           # db.js, tokenGenerator.js, lock.js, queueHelpers.js
```
