# API Database

The Planner uses MariaDB for the API database.

## Local setup

Create a database and user first:

```sql
CREATE DATABASE the_planner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'the_planner'@'localhost' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON the_planner.* TO 'the_planner'@'localhost';
FLUSH PRIVILEGES;
```

Apply the initial schema:

```powershell
mysql -u the_planner -p the_planner < apps/api/db/migrations/0001_initial_schema.sql
```

## Schema rules

- Every user-owned table has `user_id`.
- `tasks` own meaning, hierarchy, target dates, and completion state.
- `plans` own time, place, memo, supplies, and costs.
- `plans` intentionally has no `status`, `is_done`, or `completed_at`.
- Plan screen checkboxes are stored on `plan_tasks`.
- Repeat scheduling is stored separately from Task in `repeat_rules` and `repeat_occurrences`.
