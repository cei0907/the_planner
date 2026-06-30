-- The Planner initial MariaDB schema.
-- This migration keeps Task meaning and Plan execution context separate.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
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
  CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_id) REFERENCES tasks(id),
  CONSTRAINT ck_tasks_level_range CHECK (level BETWEEN 1 AND 5),
  CONSTRAINT ck_tasks_root_level CHECK (
    (parent_id IS NULL AND level = 1)
    OR parent_id IS NOT NULL
  ),
  CONSTRAINT ck_tasks_target_range CHECK (
    target_start_at IS NULL
    OR target_end_at IS NULL
    OR target_end_at > target_start_at
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_progress (
  task_id BIGINT UNSIGNED NOT NULL,
  leaf_total_count INT UNSIGNED NOT NULL DEFAULT 0,
  leaf_done_count INT UNSIGNED NOT NULL DEFAULT 0,
  progress_rate DECIMAL(6,5) NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (task_id),
  CONSTRAINT fk_task_progress_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT ck_task_progress_counts CHECK (leaf_done_count <= leaf_total_count),
  CONSTRAINT ck_task_progress_rate CHECK (progress_rate >= 0 AND progress_rate <= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plans (
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
  CONSTRAINT fk_plans_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT ck_plans_time_range CHECK (end_at > start_at),
  CONSTRAINT ck_plans_estimated_cost CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  CONSTRAINT ck_plans_actual_cost CHECK (actual_cost IS NULL OR actual_cost >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS repeat_rules (
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
  CONSTRAINT fk_repeat_rules_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT ck_repeat_rules_interval CHECK (interval_value >= 1),
  CONSTRAINT ck_repeat_rules_end_condition CHECK (
    (end_type = 'never' AND end_at IS NULL AND occurrence_count IS NULL)
    OR (end_type = 'until_date' AND end_at IS NOT NULL AND occurrence_count IS NULL)
    OR (end_type = 'count' AND end_at IS NULL AND occurrence_count IS NOT NULL)
  ),
  CONSTRAINT ck_repeat_rules_default_time CHECK (
    default_start_time IS NULL
    OR default_end_time IS NULL
    OR default_end_time > default_start_time
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS repeat_occurrences (
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
  CONSTRAINT fk_repeat_occurrences_rule FOREIGN KEY (repeat_rule_id) REFERENCES repeat_rules(id) ON DELETE CASCADE,
  CONSTRAINT ck_repeat_occurrences_time_range CHECK (scheduled_end_at > scheduled_start_at),
  CONSTRAINT ck_repeat_occurrences_completed_at CHECK (
    (status = 'done' AND completed_at IS NOT NULL)
    OR (status <> 'done')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plan_tasks (
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
  CONSTRAINT fk_plan_tasks_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_plan_tasks_task FOREIGN KEY (task_id) REFERENCES tasks(id),
  CONSTRAINT fk_plan_tasks_repeat_occurrence FOREIGN KEY (repeat_occurrence_id) REFERENCES repeat_occurrences(id) ON DELETE SET NULL,
  CONSTRAINT ck_plan_tasks_completed_at CHECK (
    (status = 'done' AND completed_at IS NOT NULL)
    OR (status = 'todo' AND completed_at IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plan_supplies (
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
  CONSTRAINT fk_plan_supplies_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
