# MONGODB_URI setup (TaskFlow)

Backend: `TaskFlow/server/server.js` loads `.env` via `dotenv.config()` and validates required vars in `TaskFlow/server/config/envValidator.js`.

## Set your MongoDB URI
In `TaskFlow/server/.env` (or the `.env` file your `server.js` run uses), set:

```env
MONGODB_URI=mongodb+srv://Akshat:Akshat123@cluster0.mrjwyut.mongodb.net/?appName=Cluster0
```

## If you get ECONNREFUSED / SRV/DNS failures

If your environment cannot resolve `mongodb+srv` (DNS/SRV blocked), set the direct connection string from Atlas instead:

```env
# Optional: only if mongodb+srv fails in your network
MONGODB_URI_DIRECT=mongodb://<host>:<port>/?replicaSet=<replicaSet>&authSource=admin&tls=true
```

> Use the “Direct connection” / “MONGODB Connection String (Direct Connection)” option from your Atlas cluster.

## Restart
Restart the backend:

```bash
cd TaskFlow/server
npm run start
```

## Quick verification
Call:
- `GET /api/health`

It returns `status: ok` when Mongo is connected, otherwise `degraded`.

