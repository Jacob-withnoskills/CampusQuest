# Windows setup checklist

- Install a supported Node.js LTS release.
- Install PostgreSQL and remember the database password.
- Install a Redis-compatible local service if the project requires the cache check.
- Copy `backend/.env.example` to `backend/.env`.
- Set `DATABASE_URL` and `REDIS_URL`.
- Run `database/schema.sql` against the `campus_quest` database.
- Run backend and frontend in separate PowerShell windows.

PowerShell commands:
```powershell
# Backend
cd C:\path\to\campus-quest-starter\backend
Copy-Item .env.example .env
npm install
npm run typecheck
npm run dev

# Frontend (new PowerShell window)
cd C:\path\to\campus-quest-starter\frontend
npm install
npm run typecheck
npm run dev
```
