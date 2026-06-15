# TaskFlow — Project Documentation

Full technical reference for architecture, API, Socket.IO, security, testing, and deployment.

---

## Table of Contents

1. [Architecture](#architecture)
2. [API Reference](#api-reference)
3. [Socket.IO Events](#socketio-events)
4. [Security Implementation](#security-implementation)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Performance & Scalability](#performance--scalability)

---

## Architecture

### Full System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│                                                             │
│  React 18 + Vite + Tailwind CSS + React Router             │
│                                                             │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────────────┐ │
│  │  Pages      │  │ Components │  │  Context / State     │ │
│  │  Dashboard  │  │  Kanban    │  │  AuthContext         │ │
│  │  Projects   │  │  TaskCard  │  │  Socket.IO Client    │ │
│  │  Board      │  │  Sidebar   │  │  Axios (withCreds)   │ │
│  │  Tasks      │  │  Navbar    │  │                      │ │
│  └─────────────┘  └────────────┘  └──────────────────────┘ │
│                         │                │                  │
│                    REST API         WebSocket               │
└─────────────────────────────────────────────────────────────┘
                          │                │
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                      │
│                                                             │
│  Express.js + Helmet + CORS + Rate Limiting + Morgan        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Middleware Pipeline                    │   │
│  │  protect → validateObjectId → validate(Joi) → ctrl  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Routes: /auth  /projects  /boards  /lists  /cards         │
│          /comments  /notifications  /analytics              │
└─────────────────────────────────────────────────────────────┘
                          │                │
┌──────────────────────────┐  ┌────────────────────────────┐
│    Business Logic        │  │     Real-Time Server       │
│                          │  │                            │
│  Services Layer          │  │  Socket.IO Server          │
│  ├─ authService          │  │  ├─ JWT auth middleware    │
│  ├─ projectService       │  │  ├─ Board rooms            │
│  ├─ boardService         │  │  │  (membership-gated)     │
│  ├─ cardService          │  │  ├─ User notification rooms│
│  ├─ notificationService  │  │  └─ Online presence        │
│  └─ analyticsService     │  │                            │
│                          │  └────────────────────────────┘
│  Repositories Layer      │
│  ├─ cardRepository       │
│  ├─ boardRepository      │
│  └─ listRepository       │
└──────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                            │
│                                                             │
│  MongoDB + Mongoose                                         │
│                                                             │
│  Collections:                                               │
│  users · projects · boards · lists · cards                  │
│  notifications · comments · revokedtokens                   │
│                                                             │
│  Indexes: compound, text search, TTL (notifications,        │
│           revoked tokens), partial (archived docs)          │
└─────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **Controllers** | Parse HTTP request, call service, return HTTP response. No business logic. |
| **Services** | Business rules, authorization checks, DB coordination, socket emissions. |
| **Repositories** | Mongoose model wrappers — single source of truth for DB access patterns. |
| **Validators** | Joi schemas applied as middleware before any controller runs. |
| **Utils** | Stateless helpers: RBAC matrix, regex escape, token blocklist, cookie helpers. |

---

## API Reference

All endpoints are prefixed with `/api`. Authentication uses `HttpOnly` cookies set automatically on login/register.

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Create a new user account |
| `POST` | `/login` | Public | Authenticate and receive session cookie |
| `POST` | `/logout` | Private | Revoke current token and clear cookie |
| `GET` | `/profile` | Private | Get authenticated user profile |
| `PUT` | `/profile` | Private | Update name, email, or avatar URL |
| `PUT` | `/password` | Private | Change password (revokes current token) |

### Projects — `/api/projects`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Private | List all projects for the authenticated user |
| `POST` | `/` | Private | Create a project (auto-provisions Kanban board + 4 default lists) |
| `GET` | `/:id` | Member | Get a single project |
| `PUT` | `/:id` | Admin+ | Update project metadata |
| `DELETE` | `/:id` | Owner | Delete project and all related data (cascade) |
| `GET` | `/:id/members` | Member | List project team with roles |
| `POST` | `/:id/members` | Admin+ | Invite a member by email |
| `PUT` | `/:id/members/:userId` | Admin+ | Update a member's role |
| `DELETE` | `/:id/members/:userId` | Admin+ | Remove a member |
| `GET` | `/:id/board` | Member | Get or lazily create the project's Kanban board |

### Boards — `/api/boards`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Private | List all accessible boards |
| `POST` | `/` | Private | Create a standalone board |
| `GET` | `/:id` | Member | Get full board with nested lists and cards |
| `PUT` | `/:id` | Admin+ | Update board metadata |
| `DELETE` | `/:id` | Owner | Delete board and cascade to lists/cards |
| `POST` | `/:id/members` | Admin+ | Add a member to the board |
| `DELETE` | `/:id/members/:userId` | Admin+ | Remove a member from the board |

### Lists — `/api/lists`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/` | Member | Create a new list on a board |
| `PUT` | `/:id` | Member | Rename or reposition a list |
| `DELETE` | `/:id` | Admin+ | Delete a list and all its cards |
| `PUT` | `/reorder` | Member | Reorder all lists on a board |

### Cards — `/api/cards`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Private | Search and filter cards across all accessible boards |
| `POST` | `/` | Member | Create a new card in a list |
| `GET` | `/:id` | Member | Get a card with comments and assignees |
| `PUT` | `/:id` | Member | Update title, description, priority, due date, labels, checklist |
| `DELETE` | `/:id` | Member | Delete a card |
| `PUT` | `/:id/move` | Member | Move card to another list (body: `{ listId, position }`) |
| `POST` | `/:id/comments` | Member | Add a comment (body: `{ text }`) |
| `PUT` | `/:id/assign` | Member | Assign a board member (body: `{ userId }`) |
| `PUT` | `/:id/unassign` | Member | Unassign a user (body: `{ userId }`) |

**Query parameters for `GET /cards`:**

| Param | Type | Description |
|---|---|---|
| `search` | string | Full-text search on title and description |
| `status` | string | `todo` · `in-progress` · `review` · `done` |
| `priority` | string | `low` · `medium` · `high` · `urgent` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (max: 100) |
| `sort` | string | `newest` · `oldest` · `dueDate` · `priority` · `alphabetical` |

### Notifications — `/api/notifications`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Private | Get all notifications for the current user |
| `GET` | `/unread/count` | Private | Get unread notification count |
| `PUT` | `/:id/read` | Private | Mark a single notification as read |
| `PUT` | `/read-all` | Private | Mark all notifications as read |
| `DELETE` | `/:id` | Private | Delete a notification |

### Analytics — `/api/analytics`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/overview` | Private | Summary: total projects, tasks, completion rate |
| `GET` | `/project-progress` | Private | Completion % per project |
| `GET` | `/team-productivity` | Private | Completed task count per team member |
| `GET` | `/task-status` | Private | Completed vs. pending task counts |

### Error Response Format

All errors return a consistent JSON body:

```json
{
  "message": "Human-readable error description"
}
```

HTTP status codes follow REST conventions: `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `422` Validation Error, `500` Server Error, `503` Database Unavailable.

---

## Socket.IO Events

### Connection & Authentication

The client connects with `withCredentials: true`. The server verifies the JWT cookie in `io.use()` before any connection completes. Unauthenticated handshakes receive `Error('Authentication required')` and are rejected.

```
Client                      Server
  │  connect (cookie)         │
  │ ────────────────────────► │  verify JWT cookie
  │                           │  attach socket.user
  │  connected                │
  │ ◄──────────────────────── │
  │                           │
  │  joinBoard(boardId)        │
  │ ────────────────────────► │  query Board.findById(boardId)
  │                           │  verify socket.user is member
  │  joinedBoard              │  socket.join(`board:${boardId}`)
  │ ◄──────────────────────── │
```

### Client → Server Events

| Event | Payload | Description |
|---|---|---|
| `joinBoard` | `boardId: string` | Request to join a board room. Server verifies membership before joining. |
| `leaveBoard` | `boardId: string` | Leave a board room. |
| `joinUser` | `userId: string` | Join personal notification room (`user:${userId}`). |
| `leaveUser` | `userId: string` | Leave personal notification room. |

### Server → Client Events (Board Room)

| Event | Trigger | Payload |
|---|---|---|
| `cardCreated` | New card added to a list | Full card object |
| `cardUpdated` | Card fields modified | Updated card object |
| `cardDeleted` | Card removed | `{ cardId, listId }` |
| `cardMoved` | Card dragged to another column | `{ card, fromList, toList, position }` |
| `joinedBoard` | Successful `joinBoard` | `{ boardId }` |

### Server → Client Events (User Room)

| Event | Trigger | Payload |
|---|---|---|
| `notification` | Task assigned, project invited, card updated | Full notification object |
| `onlineUsersCount` | User connects or disconnects | `{ count: number }` |
| `userOnline` | User connects | `{ userId, count }` |
| `userOffline` | User's last socket disconnects | `{ userId }` |

### Board Room Security

The `joinBoard` handler queries the database before joining:

```js
socket.on('joinBoard', async (boardId) => {
  const board = await Board.findById(boardId).select('owner members').lean();
  if (!board) return socket.emit('error', { message: 'Board not found' });

  const canAccess = board.owner.toString() === uid ||
    board.members.some(m => (m.user || m).toString() === uid);

  if (!canAccess) return socket.emit('error', { message: 'Not authorized' });
  socket.join(`board:${boardId}`);
});
```

This prevents any authenticated user from joining rooms for boards they are not a member of.

---

## Security Implementation

### JWT & Cookie Architecture

- Tokens are signed with a `jti` claim (`uuid/v4`) enabling per-token revocation.
- Delivered and stored exclusively in `HttpOnly`, `Secure` (production), `SameSite=Strict` cookies.
- No token exposure in `localStorage` or response bodies.

### Persistent Token Revocation

On logout or password change:
1. Token's `jti` is written to `RevokedToken` MongoDB collection with `expiresAt` = token's natural expiry.
2. A TTL index auto-deletes entries after expiry, keeping the collection bounded.
3. An in-process LRU cache (5-minute TTL) provides sub-millisecond hot-path checks without a DB round-trip on every request.
4. On cache miss, falls back to MongoDB — covers post-restart scenarios.

```
protect middleware:
  decode JWT
  → check in-process cache (hot path, ~0ms)
  → if cache miss, check RevokedToken collection
  → if revoked → 401
  → proceed
```

### RBAC Permission Matrix

| Permission | Member | Admin | Owner |
|---|---|---|---|
| View project / board | ✅ | ✅ | ✅ |
| Create, update, move cards | ✅ | ✅ | ✅ |
| Edit project metadata | — | ✅ | ✅ |
| Invite members | — | ✅ | ✅ |
| Remove members | — | ✅ | ✅ |
| Change member roles | — | ✅ | ✅ |
| Delete project | — | — | ✅ |

### Rate Limiting

| Tier | Window | Limit | Applied To |
|---|---|---|---|
| Global | 15 min | 200 req | All API routes |
| Auth | 15 min | 30 req | `/register`, `/login` |
| Sensitive | 15 min | 10 req | `/password` |

### Input Validation Pipeline

Every mutating endpoint:
1. `protect` — verify JWT, check revocation
2. `validateObjectId` — reject malformed MongoDB IDs before any DB call
3. `validate(joiSchema)` — reject invalid/missing fields with structured errors
4. Controller — call service

### Additional Hardening

- **Helmet.js** — sets `Content-Security-Policy`, `X-Frame-Options`, `X-XSS-Protection`, and 10+ other headers.
- **`express-mongo-sanitize`** — strips `$` operators and `.` from all request bodies.
- **`hpp`** — prevents HTTP parameter pollution.
- **Avatar URL validation** — `updateUserProfile` rejects any avatar value that is not a valid `https://` URL.
- **Winston logger** — redacts `password`, `token`, `secret`, `authorization`, `cookie` fields from all log output.

---

## Testing

### Server (Jest + Supertest)

```bash
cd server && npm test
```

| Test File | What It Covers |
|---|---|
| `auth.integration.test.js` | Register, login, JWT validation, logout, password change, profile update |
| `authorization.test.js` | `authorizeProjectAccess`, `authorizeBoardAccess` utility functions |
| `projectPermissions.test.js` | `getEffectiveRoleForUser`, `hasPermission`, full RBAC matrix |
| `projects.integration.test.js` | Project CRUD, member management, cascading delete |
| `boards-lists-cards.integration.test.js` | Board creation, list operations, full card lifecycle |
| `comments-notifications.integration.test.js` | Comment creation, notification delivery |
| `socket.test.js` | Socket.IO auth, board room gating, event broadcasting |
| `pagination.test.js` | Pagination utility edge cases |

Coverage thresholds enforced: 50% branches, functions, lines, statements.

### Client (Vitest)

```bash
cd client && npm test
```

### Coverage Report

```bash
cd server && npm run test:coverage
cd client && npm run test:coverage
```

### Test Environment

`jest.setup.js` configures isolated test env vars and mocks console output. Tests use a separate `taskflow_test` MongoDB database. Mongoose connections are opened before all tests and closed after.

---

## Deployment

### MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user with `readWrite` access.
3. Whitelist your deployment IP (or `0.0.0.0/0` for dynamic IPs on free hosting).
4. Copy the SRV connection string into `MONGODB_URI`.

### Backend — Railway

1. New project → connect GitHub repo.
2. Set **Root Directory** to `server`.
3. **Start Command:** `node server.js`
4. Add all variables from `server/.env.example` in the Variables tab.
5. Railway auto-detects Node.js 18+ from the `engines` field.

### Backend — Render

1. New **Web Service** → connect GitHub repo.
2. **Root Directory:** `server`
3. **Build Command:** `npm install`
4. **Start Command:** `node server.js`
5. Add environment variables in the Render dashboard.

### Frontend — Vercel

1. Import repo at [vercel.com](https://vercel.com).
2. **Root Directory:** `client`
3. Vercel auto-detects Vite. Build: `npm run build`. Output: `dist`.
4. Add:
   - `VITE_API_URL` → `https://your-backend.railway.app/api`
   - `VITE_SOCKET_URL` → `https://your-backend.railway.app`

### Cross-Origin Configuration

| Variable | Value |
|---|---|
| `CLIENT_URL` (backend) | Your Vercel frontend URL |
| `VITE_API_URL` (frontend) | Your backend URL + `/api` |
| `VITE_SOCKET_URL` (frontend) | Your backend URL |

---

## Performance & Scalability

### MongoDB Indexes

| Collection | Index | Purpose |
|---|---|---|
| `cards` | `{ list, position }` | Ordered card fetch per column |
| `cards` | `{ status, isArchived }` | Status filter queries |
| `cards` | `{ priority, createdAt }` | Priority sort |
| `cards` | `{ title: 'text' }` | Full-text search |
| `boards` | `{ owner, isArchived }` | User board listing |
| `boards` | `{ project, isArchived }` | Project-to-board lookup |
| `boards` | `{ 'members.user', isArchived }` | Member board access |
| `notifications` | `{ user, isRead, createdAt }` | Notification feed + unread count |
| `notifications` | `{ createdAt: 1 }` TTL 90d | Auto-delete old notifications |
| `revokedtokens` | `{ expiresAt: 1 }` TTL | Auto-delete expired blocklist entries |

### Query Optimisations

- Board access check uses `.select('owner members isArchived').lean()` before executing the full populated query.
- Project creation uses `List.insertMany()` — one DB round-trip for all 4 default columns.
- All paginated endpoints use explicit `countDocuments` + `find` with `skip`/`limit`.

### Frontend Bundle

Manual Rollup chunk splitting keeps the initial bundle lean:

| Chunk | Contents |
|---|---|
| `vendor` | react, react-dom, react-router-dom |
| `charts` | recharts |
| `dnd` | @hello-pangea/dnd |
| `socket` | socket.io-client |

Route-level code splitting via `React.lazy()` — each page loads on demand.
