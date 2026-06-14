# TaskFlow

TaskFlow is a full-stack project management tool inspired by Trello and Asana. It helps teams organize work into **Projects**, **Lists (columns)**, and **Cards (tasks)** with comments, priorities, due dates, and notifications.

> Built with the **MERN** stack (MongoDB, Express, React, Node.js)

---

## Project Overview

TaskFlow provides a collaborative workspace where users can:

- Create and manage multiple projects
- Organize work into lists and cards
- Assign members, update roles, and collaborate via comments
- Track task progress and receive real-time notifications

---

## Features

- **Authentication & Authorization**
  - JWT-based login/registration
  - Protected routes (role-aware permissions)
- **Projects (Boards)**
  - Create, update, delete, and archive projects
  - Manage members and member roles (owner/admin/member)
- **Lists / Columns**
  - Organize cards within a project
  - Reorder lists
- **Cards / Tasks**
  - Titles, descriptions, priorities, due dates
  - Move cards between lists
  - Assign/unassign members
- **Collaboration**
  - Comment threads per card
- **Notifications**
  - Notification model persisted in MongoDB
  - Real-time delivery with Socket.IO
- **Analytics**
  - Overview metrics, project progress, team productivity, task status breakdown
- **Responsive UI**
  - Tailwind-based responsive layout

---

## Screenshots

Add your screenshots here. Suggested captures:

1. Login / Register
2. Dashboard
3. Projects page
4. Team / Member management
5. Board (Kanban) view
6. Card details with comments
7. Notifications bell

Example layout:

```md
![Login](./screenshots/login.png)
![Dashboard](./screenshots/dashboard.png)
![Board](./screenshots/board.png)
```

---

## Tech Stack

### Frontend
- **React** (Vite)
- **Tailwind CSS**
- **Axios**
- React Router

### Backend
- **Node.js**
- **Express.js**
- **MongoDB** (MongoDB Atlas recommended)
- **Mongoose** ODM
- **JWT** authentication
- **Socket.IO** for real-time notifications

---

## Installation Guide

### Prerequisites

- Node.js **18+**
- MongoDB Atlas (or local MongoDB)
- npm

### 1) Clone the repository

```bash
cd TaskFlow
```

### 2) Install dependencies

```bash
npm install
cd server
npm install
cd ../client
npm install
```

### 3) Configure environment variables

Create server env file:

```bash
cd server
# copy from template if available
# cp .env.example .env
```

Then set:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
# Optional fallback if your environment blocks mongodb+srv SRV/DNS resolution
# (use only the "direct connection" string from Atlas)
MONGODB_URI_DIRECT=your_direct_mongodb_connection_string
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
```


Client env (in `client/`):

```env
VITE_API_URL=http://localhost:5000/api
```

> The server reads `process.env.MONGODB_URI`, `process.env.JWT_SECRET`, `process.env.PORT`, and `process.env.CLIENT_URL`.

### 4) Run the app (development)

```bash
npm run dev
```

Or run separately:

- Terminal 1 (server)

```bash
cd server
npm run dev
```

- Terminal 2 (client)

```bash
cd client
npm run dev
```

### Access

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:5000/api/health`

---

## Environment Variables

### Server (`server/.env`)

- `PORT` — Backend port (default: `5000`)
- `NODE_ENV` — Environment mode
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — Secret used to sign JWT tokens
- `CLIENT_URL` — Allowed client origin for CORS / Socket connections

### Client (`client/.env`)

- `VITE_API_URL` — Base URL for API calls (e.g. `http://localhost:5000/api`)

---

## API Documentation

Base paths used in this project:
- Auth: `/api/auth`
- Projects/Boards: `/api/projects`
- Boards: `/api/boards`
- Lists: `/api/lists`
- Cards: `/api/cards`
- Comments: `/api/comments`
- Notifications: `/api/notifications`
- Analytics: `/api/analytics`

> Many routes are protected with JWT middleware.

### Health
- `GET /api/health`

Response:
```json
{ "status": "ok", "message": "TaskFlow API is running" }
```

---

### Authentication
- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login user
- `GET /api/auth/me` — Get current user
- `PUT /api/auth/profile` — Update profile
- `PUT /api/auth/password` — Update password

---

### Projects (Boards)
- `GET /api/projects` — Get projects for the authenticated user (supports search/pagination)
- `GET /api/projects/:id` — Get a single project if authorized
- `POST /api/projects` — Create a project
- `PUT /api/projects/:id` — Update project
- `DELETE /api/projects/:id` — Delete project

Member management:
- `GET /api/projects/:id/members` — Get project members (supports filtering/pagination)
- `POST /api/projects/:id/members` — Invite member by email (role: `admin|member`)
- `PUT /api/projects/:id/members/:userId` — Change member role
- `DELETE /api/projects/:id/members/:userId` — Remove member

---

### Analytics
Routes are JWT-protected.
- `GET /api/analytics/overview`
- `GET /api/analytics/project-progress`
- `GET /api/analytics/team-productivity`
- `GET /api/analytics/task-status`

---

### Real-time Notifications (Socket.IO)

- Socket.IO is initialized on the server.
- Notifications are emitted to a room/user (see server socket handler usage).
- Client subscribes via the Socket context.

---

## Deployment Instructions

### Recommended production setup

1. Build the client

```bash
cd client
npm run build
```

2. Set environment variables in production (server + client)

3. Run the backend with a process manager (recommended)

Examples:
- Use **pm2**
- Or run with Docker
- Or configure as a system service

### CORS / Client origin

Ensure `CLIENT_URL` matches your deployed frontend origin (e.g. `https://yourdomain.com`).

### MongoDB

Use a production MongoDB URI (Atlas recommended). Ensure network access is allowed from your deployment environment.

### WebSockets

Socket.IO requires that your hosting environment allows WebSocket upgrade.

---

## License

MIT

---

## Notes

- Replace the placeholder screenshots with actual images placed under `./screenshots/` (create the folder if needed).
- This README can be extended with request/response examples per endpoint if you want API docs generated with OpenAPI/Swagger.

