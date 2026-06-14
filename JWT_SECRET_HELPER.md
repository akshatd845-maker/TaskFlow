# JWT_SECRET setup (TaskFlow)

TaskFlow uses `process.env.JWT_SECRET` in:
- `server/controllers/authController.js` (sign)
- `server/middleware/auth.js` (verify)
- `server/socket.js` (Socket.IO auth verify)

## Set your JWT secret
In `TaskFlow/.env` (root of the backend run), set:

```env
JWT_SECRET=5xitTuAZQxeA0H2W9CBZ1Yc1qftjf/ub+qhTXA23XA8=
```

## Restart
Restart the server after changing `.env`:

```bash
npm run start
```

## Env validation note
`server/config/envValidator.js` requires `JWT_SECRET` to be at least 32 characters.

## Quick verification
Call:
- `GET /api/health`

Then try login and a protected endpoint.

