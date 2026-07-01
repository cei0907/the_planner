# Local Development Setup

This document records the local setup used to preview The Planner quickly on this Windows machine.

## Current local services

The project can be previewed with three local processes:

- MariaDB project instance: `127.0.0.1:3307`
- Node.js API: `http://127.0.0.1:4000/api`
- React/Vite web app: `http://127.0.0.1:5174`

The machine already has MariaDB 10.6 installed at:

```text
C:\Program Files\MariaDB 10.6
```

To avoid changing the existing Windows MariaDB service, a project-local MariaDB data directory was initialized at:

```text
D:\The Plan\the_planner\.mariadb\data
```

## Environment files

API env:

```text
apps/api/.env
```

```env
PORT=4000
DATABASE_URL=mysql://the_planner:change-me@127.0.0.1:3307/the_planner
```

Web env:

```text
apps/web/.env.local
```

```env
VITE_API_BASE_URL=http://127.0.0.1:4000/api
```

## Start commands

Start project MariaDB:

```powershell
Start-Process -FilePath "C:\Program Files\MariaDB 10.6\bin\mariadbd.exe" -ArgumentList '"--defaults-file=D:\The Plan\the_planner\.mariadb\data\my.ini" "--datadir=D:\The Plan\the_planner\.mariadb\data" --port=3307 --bind-address=127.0.0.1 --ssl=0' -WorkingDirectory "D:\The Plan\the_planner\.mariadb\data" -WindowStyle Hidden
```

Start API:

```powershell
cd "D:\The Plan\the_planner"
npm run dev:api
```

Start web:

```powershell
cd "D:\The Plan\the_planner"
npm run dev:web -- --port=5174
```

Open:

```text
http://127.0.0.1:5174
```

## Health checks

API health:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4000/api/health
```

Expected result includes:

```json
{
  "ok": true,
  "database": {
    "ok": true,
    "configured": true
  }
}
```

Web health:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5174
```

Expected HTTP status: `200`.

## Database initialization already performed

A local database and app user were created:

```sql
CREATE DATABASE the_planner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'the_planner'@'localhost' IDENTIFIED BY 'change-me';
CREATE USER 'the_planner'@'127.0.0.1' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON the_planner.* TO 'the_planner'@'localhost';
GRANT ALL PRIVILEGES ON the_planner.* TO 'the_planner'@'127.0.0.1';
```

The initial schema was applied from:

```text
apps/api/db/migrations/0001_initial_schema.sql
```

A small sample plan/task was added so the planner screens are not empty on first preview.

## Notes

- The existing MariaDB Windows service on port `3306` was not modified.
- This setup uses a project-local MariaDB instance on port `3307`.
- If the computer restarts, start MariaDB, API, and web again with the commands above.
