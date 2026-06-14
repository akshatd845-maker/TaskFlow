# TaskFlow DNS / MongoDB ECONNREFUSED Fix Plan

## Information gathered
- Backend connects using `TaskFlow/server/config/db.js` with `process.env.MONGODB_URI` via `mongoose.connect(...)`.
- Env validation requires `MONGODB_URI` as a valid URI (`TaskFlow/server/config/envValidator.js`).
- Server starts regardless of DB state; it logs `MongoDB connection failed: <message>` and exposes `/api/health`.
- `search_files` is currently unavailable due to missing ripgrep in the environment.
- `TaskFlow/MONGODB_URI_HELPER.md` contains an Atlas `mongodb+srv://...` example.

## Problem
- Error reported: `MongoDB connection failed: query ECONNREFUSED`.
- Common causes:
  1) Wrong host/port (e.g., pointing to `localhost:27017` when MongoDB isn’t running there)
  2) Using `mongodb://` to a DNS hostname that doesn’t resolve
  3) Using Atlas `mongodb+srv://...` while network/DNS rules block SRV resolution
  4) Missing/incorrect `MONGODB_URI` in the actual runtime `.env` file

## Plan (code changes)
1) Make MongoDB connection logs more actionable without leaking credentials:
   - Log only host (already partially done via `sanitizeMongoHost`).
   - Additionally log whether URI uses `mongodb+srv` vs `mongodb`.
2) Add a fallback environment variable (`MONGODB_URI_DIRECT`) for direct connection if SRV/DNS fails:
   - Keep behavior unchanged unless `MONGODB_URI_DIRECT` is provided.
   - If provided, try `mongodb.connect(MONGODB_URI_DIRECT)` when `MONGODB_URI` is `mongodb+srv` and the failure looks like DNS/SRV related.
3) Update `TaskFlow/README.md` and `TaskFlow/MONGODB_URI_HELPER.md` with clear instructions:
   - Where to set `server/.env` (must be the one used when running `server.js`).
   - If SRV DNS fails, use the Atlas “Connect using MongoDB Compass / Drivers” *direct connection* string.

## Dependent files to edit
- `TaskFlow/server/config/db.js`
- `TaskFlow/README.md`
- `TaskFlow/MONGODB_URI_HELPER.md`

## Followup steps
- Restart backend.
- Test:
  - `GET /api/health` should return `status: ok`.
- If still failing:
  - Verify the running environment actually has `MONGODB_URI` set (print `NODE_ENV` and whether `MONGODB_URI` is present, but never print full URI).

<ask_followup_question>
Proceed with code changes to improve MongoDB connection diagnostics and add optional direct-connection fallback? Also, confirm whether your current `MONGODB_URI` is Atlas `mongodb+srv://` or a `mongodb://host:port` string.
</ask_followup_question>

