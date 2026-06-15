<div align="center">

# TaskFlow

**Enterprise Project Management Platform**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-c3c0ff?style=flat-square)](LICENSE)

A real-time project management platform for engineering teams — Kanban boards, role-based collaboration, live updates, and analytics in a dark-first enterprise interface.

[Installation](#installation) · [Documentation](docs/PROJECT_DOCUMENTATION.md) · [Deployment](#deployment) · [Roadmap](#roadmap)

</div>

---

## Overview

TaskFlow is a full-stack SaaS platform combining project tracking, Kanban task management, team collaboration, and real-time analytics. Built on the MERN stack with Socket.IO, it features cookie-based JWT authentication with persistent token revocation, granular role-based access control, and live board synchronisation across all connected clients.

Designed to be self-hostable, production-grade, and straightforward to extend.

---

## Features

- **Authentication** — HttpOnly cookie JWTs, persistent token revocation (MongoDB TTL), bcrypt password hashing
- **Project Management** — multi-project workspaces, auto-provisioned Kanban boards, cascading deletes
- **Kanban Board** — drag-and-drop cards with priorities, due dates, labels, checklists, and assignees
- **RBAC** — three-tier permission model (`owner` / `admin` / `member`) enforced at every API route
- **Real-Time** — live card events, notifications, and online presence via Socket.IO board rooms
- **Team Collaboration** — invite by email, role management, per-project and per-board membership
- **Analytics Dashboard** — task completion rates, project progress, and team productivity charts
- **Search & Filter** — cross-board task search with status and priority filtering, paginated results
- **Security** — Helmet, CORS, rate limiting, Joi validation, `express-mongo-sanitize` on every request

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router 6, Axios, Socket.IO Client, Recharts, @hello-pangea/dnd |
| **Backend** | Node.js ≥ 18, Express 4, MongoDB 8, Mongoose, Socket.IO 4 |
| **Auth & Security** | JWT (jti revocation), bcryptjs, Helmet, express-rate-limit, express-mongo-sanitize, Joi |
| **Logging** | Winston (structured, with sensitive-field redaction) |
| **Testing** | Jest, Supertest (server) · Vitest (client) |

---

## Architecture

```
┌─────────────────────────────────────────┐
│   React Client (Vite + Tailwind CSS)    │
│   Context · Pages · Components          │
└──────────────┬──────────────────────────┘
               │ REST + WebSocket
┌──────────────▼──────────────────────────┐
│   Express API (Helmet · CORS · Rate)    │
│   protect → validate(Joi) → controller  │
│   Services · Repositories · Utils       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   MongoDB (Mongoose)                    │
│   Compound indexes · TTL collections   │
│   users · projects · boards · cards    │
│   notifications · revokedtokens        │
└─────────────────────────────────────────┘
```

> See [Architecture & API Reference](docs/PROJECT_DOCUMENTATION.md) for the full diagram, Socket.IO event table, security implementation, and endpoint documentation.

---

## Installation

**Prerequisites:** Node.js ≥ 18, npm ≥ 9, MongoDB (local or Atlas)

```bash
# 1. Clone
git clone https://github.com/your-username/taskflow.git
cd taskflow

# 2. Install all dependencies (root + client + server)
npm run install-all

# 3. Configure environment variables
cp server/.env.example server/.env
# Edit server/.env with your values (see section below)

# 4. Start both servers
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api |
| Health check | http://localhost:5000/api/health |

---

## Environment Variables

### `server/.env`

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string (Atlas SRV or local) |
| `JWT_SECRET` | ✅ | Random secret ≥ 32 chars — generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `PORT` | ✅ | Server port (default `5000`) |
| `CLIENT_URL` | ✅ | Frontend URL for CORS (e.g. `http://localhost:5173`) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `JWT_EXPIRE` | — | Token lifetime (default `7d`) |
| `LOG_LEVEL` | — | Winston level: `error` · `warn` · `info` · `debug` |

### `client/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL — defaults to `/api` (Vite proxy handles it in dev) |
| `VITE_SOCKET_URL` | Socket.IO server URL — defaults to `window.location.origin` |

---

## Running Locally

```bash
# Both servers (recommended)
npm run dev

# Backend only
npm run server

# Frontend only
npm run client

# Production build
npm run build          # builds React → client/dist
cd server && npm start # starts Express in production mode
```

---

## Deployment

| Platform | Service | Notes |
|---|---|---|
| [Vercel](https://vercel.com) | Frontend | Root dir: `client` · Build: `npm run build` · Output: `dist` |
| [Railway](https://railway.app) | Backend | Root dir: `server` · Start: `node server.js` |
| [Render](https://render.com) | Backend | Web Service · Build: `npm install` · Start: `node server.js` |
| [MongoDB Atlas](https://cloud.mongodb.com) | Database | Free M0 tier works for development |

Set `CLIENT_URL` on your backend to your Vercel URL and `VITE_API_URL` on your frontend to your backend URL.

> Full step-by-step deployment instructions in [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md).

---

## Folder Structure

```
taskflow/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── components/      # Kanban, Navbar, Sidebar, Notifications, Team
│       ├── context/         # AuthContext, ThemeContext
│       ├── pages/           # Dashboard, Board, Projects, Tasks, Settings...
│       ├── services/        # Axios modules + Socket.IO client helpers
│       └── routes/          # AppRoutes with lazy loading
├── server/                  # Express backend
│   ├── config/              # DB, env validation, logger, rate limiter
│   ├── controllers/         # Thin HTTP handlers
│   ├── middleware/          # auth, validate, validateObjectId, errorHandler
│   ├── models/              # Mongoose schemas (User, Board, Card, RevokedToken...)
│   ├── repositories/        # Data access layer
│   ├── routes/              # Route definitions
│   ├── services/            # Business logic
│   ├── utils/               # RBAC, token blocklist, escapeRegex, authCookie
│   ├── validators/          # Joi schemas per resource
│   └── __tests__/           # Integration and unit tests
└── docs/
    └── PROJECT_DOCUMENTATION.md  # Full API, Socket.IO, security, and testing docs
```

---

## Roadmap

| Feature | Status |
|---|---|
| Calendar view | 🔵 In progress |
| Gantt chart | 📋 Planned |
| AI task suggestions | 📋 Planned |
| Mobile app (React Native) | 📋 Planned |
| Webhooks | 📋 Planned |
| Third-party integrations (GitHub, Slack) | 📋 Planned |
| Time tracking | 📋 Planned |
| SSO / OAuth (Google, GitHub) | 📋 Planned |

---

## Contributing

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Follow the existing architecture — logic in `services/`, validation via Joi, DB access via `repositories/`
3. Write tests for your changes
4. Open a pull request with a clear description

Commits follow [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`

---

## License

MIT © 2026 TaskFlow Contributors — see [LICENSE](LICENSE) for full text.

---

<div align="center">

Built by **Akshat** — full-stack engineer

[![GitHub](https://img.shields.io/badge/GitHub-your--username-181717?style=flat-square&logo=github)](https://github.com/akshatd845-maker)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin)](www.linkedin.com/in/akshatdixit001)

</div>
