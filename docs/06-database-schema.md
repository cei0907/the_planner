# DB 스키마 문서

이 문서는 The Planner의 MariaDB 기준 데이터베이스 스키마를 정의한다.

## 설계 원칙

1. 모든 사용자 소유 데이터는 `user_id`를 가진다.
2. Task와 Plan은 분리한다.
3. Plan은 완료 상태를 가지지 않는다.
4. Plan 화면의 체크 상태는 `plan_tasks`에 저장한다.
5. Task Tree는 MVP에서 adjacency list 방식, 즉 `tasks.parent_id`로 표현한다.
6. 진행률은 Leaf 기준 집계값으로 저장한다.
7. 반복은 Task에 직접 넣지 않고 `repeat_rules`로 분리한다.

## 공통 컬럼 규칙

- PK는 `BIGINT UNSIGNED AUTO_INCREMENT`를 기본으로 한다.
- 시간 컬럼은 `DATETIME(3)`을 사용한다.
- 삭제는 MVP에서 hard delete로 시작할 수 있으나, 확장성을 위해 `deleted_at`을 둘 수 있다.
- 금액은 정수 minor unit 또는 `DECIMAL(14,2)` 중 하나를 선택한다. MVP에서는 `DECIMAL(14,2)`를 사용한다.

## users

단일 사용자 로그인부터 시작하지만, 추후 팀 기능을 위해 사용자 테이블을 둔다.

```sql
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## tasks

Task Tree와 의미 구조를 관리한다.

```sql
CREATE TABLE tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  type ENUM('task', 'project', 'aspiration') NOT NULL DEFAULT 'task',
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  why TEXT NULL,
  level TINYINT UNSIGNED NOT NULL,
  status ENUM('todo', 'active', 'done') NOT NULL DEFAULT 'todo',
  priority TINYINT UNSIGNED NULL,
  target_start_at DATETIME(3) NULL,
  target_end_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY ix_tasks_user_parent (user_id, parent_id),
  KEY ix_tasks_user_status (user_id, status),
  KEY ix_tasks_target_range (user_id, target_start_at, target_end_at),
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_id) REFERENCES tasks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 제약 규칙

- `level`은 1부터 5까지다.
- `parent_id`가 NULL이면 `level = 1`이어야 한다.
- 부모가 있으면 자식의 `level = parent.level + 1`이어야 한다.
- Level5 Task는 하위 Task를 가질 수 없다.
- 이 규칙들은 DB CHECK보다 도메인 서비스와 테스트에서 강하게 보장한다.

## task_progress

Leaf 기준 진행률 집계값을 저장한다.

```sql
CREATE TABLE task_progress (
  task_id BIGINT UNSIGNED NOT NULL,
  leaf_total_count INT UNSIGNED NOT NULL DEFAULT 0,
  leaf_done_count INT UNSIGNED NOT NULL DEFAULT 0,
  progress_rate DECIMAL(6,5) NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (task_id),
  CONSTRAINT fk_task_progress_task FOREIGN KEY (task_id) REFERENCES tasks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## plans

Plan은 시간 슬롯과 현장성 정보를 관리한다. 완료 상태는 없다.

```sql
CREATE TABLE plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  start_at DATETIME(3) NOT NULL,
  end_at DATETIME(3) NOT NULL,
  location VARCHAR(255) NULL,
  memo TEXT NULL,
  estimated_cost DECIMAL(14,2) NULL,
  actual_cost DECIMAL(14,2) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY ix_plans_user_start (user_id, start_at),
  KEY ix_plans_user_range (user_id, start_at, end_at),
  CONSTRAINT fk_plans_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 제약 규칙

- `end_at`은 `start_at`보다 늦어야 한다.
- Plan에는 `is_done`, `status`, `completed_at`을 두지 않는다.

## plan_tasks

Plan 화면에서 체크되는 실행 항목이다.

```sql
CREATE TABLE plan_tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  task_id BIGINT UNSIGNED NOT NULL,
  repeat_occurrence_id BIGINT UNSIGNED NULL,
  status ENUM('todo', 'done') NOT NULL DEFAULT 'todo',
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_plan_tasks_plan (plan_id),
  KEY ix_plan_tasks_task (task_id),
  KEY ix_plan_tasks_user_status (user_id, status),
  UNIQUE KEY uq_plan_tasks_plan_task_occurrence (plan_id, task_id, repeat_occurrence_id),
  CONSTRAINT fk_plan_tasks_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_plan_tasks_plan FOREIGN KEY (plan_id) REFERENCES plans(id),
  CONSTRAINT fk_plan_tasks_task FOREIGN KEY (task_id) REFERENCES tasks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## plan_supplies

Plan에 필요한 준비물 체크리스트다.

```sql
CREATE TABLE plan_supplies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_plan_supplies_plan (plan_id, sort_order),
  CONSTRAINT fk_plan_supplies_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_plan_supplies_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## repeat_rules

반복 배치 규칙이다.

```sql
CREATE TABLE repeat_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  task_id BIGINT UNSIGNED NOT NULL,
  frequency ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
  interval_value INT UNSIGNED NOT NULL DEFAULT 1,
  weekdays JSON NULL,
  end_type ENUM('never', 'until_date', 'count') NOT NULL DEFAULT 'never',
  end_at DATETIME(3) NULL,
  occurrence_count INT UNSIGNED NULL,
  default_start_time TIME NULL,
  default_end_time TIME NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_repeat_rules_user_task (user_id, task_id),
  CONSTRAINT fk_repeat_rules_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_repeat_rules_task FOREIGN KEY (task_id) REFERENCES tasks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## repeat_occurrences

반복으로 생성된 개별 회차다. MVP에서는 미리 생성 방식으로 시작하는 것을 권장한다.

```sql
CREATE TABLE repeat_occurrences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  repeat_rule_id BIGINT UNSIGNED NOT NULL,
  scheduled_start_at DATETIME(3) NOT NULL,
  scheduled_end_at DATETIME(3) NOT NULL,
  status ENUM('todo', 'done', 'skipped') NOT NULL DEFAULT 'todo',
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_repeat_occurrences_rule_time (repeat_rule_id, scheduled_start_at),
  KEY ix_repeat_occurrences_user_status (user_id, status),
  CONSTRAINT fk_repeat_occurrences_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_repeat_occurrences_rule FOREIGN KEY (repeat_rule_id) REFERENCES repeat_rules(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 핵심 조회 패턴

### 특정 기간의 Plan 조회

```sql
SELECT *
FROM plans
WHERE user_id = ?
  AND deleted_at IS NULL
  AND start_at < ?
  AND end_at > ?
ORDER BY start_at ASC;
```

### Plan에 연결된 Task 조회

```sql
SELECT pt.*, t.title, t.type, t.status AS task_status
FROM plan_tasks pt
JOIN tasks t ON t.id = pt.task_id
WHERE pt.plan_id = ?
ORDER BY pt.id ASC;
```

### Plan 시간 범위에 적합한 Task 검색

```sql
SELECT *
FROM tasks
WHERE user_id = ?
  AND deleted_at IS NULL
  AND (
    target_start_at IS NULL
    OR target_end_at IS NULL
    OR (target_start_at < ? AND target_end_at > ?)
  )
ORDER BY
  CASE WHEN target_start_at IS NULL OR target_end_at IS NULL THEN 1 ELSE 0 END,
  level ASC,
  updated_at DESC;
```

## 남은 설계 결정

- 반복 회차를 항상 미리 생성할지, 일정 범위 조회 시 가상 생성할지.
- Task Tree 조회 성능이 부족해질 때 closure table을 도입할지.
- 비용을 Plan 단일 금액으로 유지할지, `expenses` 테이블로 분리할지.

