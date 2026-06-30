# API Database

The Planner uses MariaDB for the API database.

## Local setup

MariaDB can be started from the workspace after the local data directory is initialized:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-mariadb.ps1
```

Keep that terminal open while using the local database. Open another terminal for client commands.

Create a database and user first:

```sql
CREATE DATABASE the_planner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'the_planner'@'localhost' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON the_planner.* TO 'the_planner'@'localhost';
FLUSH PRIVILEGES;
```

Apply the initial schema:

```powershell
& "C:\Program Files\MariaDB 12.3\bin\mariadb.exe" --ssl=0 -h 127.0.0.1 -P 3306 -u the_planner -pchange-me the_planner
SOURCE D:/The Plan/apps/api/db/migrations/0001_initial_schema.sql;
```

## Schema rules

- Every user-owned table has `user_id`.
- `tasks` own meaning, hierarchy, target dates, and completion state.
- `plans` own time, place, memo, supplies, and costs.
- `plans` intentionally has no `status`, `is_done`, or `completed_at`.
- Plan screen checkboxes are stored on `plan_tasks`.
- Repeat scheduling is stored separately from Task in `repeat_rules` and `repeat_occurrences`.
