import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import {
  DomainError,
  assertValidPlanTimeRange,
  createChildTask,
  findAncestors,
  findDescendantsIncludingSelf,
  recalculateProgressFor,
  type CreateTaskRequest,
  type Task,
  type TaskId,
  type TaskStatus,
  type TaskSummary,
  type TaskTreeNode,
  type TaskType,
  type UpdateTaskRequest,
  type UserId,
} from "@the-planner/shared";

interface TaskRow extends RowDataPacket {
  id: number;
  user_id: number;
  parent_id: number | null;
  type: TaskType;
  title: string;
  description: string | null;
  why: string | null;
  level: number;
  status: TaskStatus;
  priority: number | null;
  target_start_at: string | null;
  target_end_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  leaf_total_count: number | null;
  leaf_done_count: number | null;
  progress_rate: string | number | null;
}

export interface TaskFilters {
  parentId?: TaskId | null;
  type?: TaskType;
  status?: TaskStatus;
  from?: string;
  to?: string;
  includeNoTarget?: boolean;
}

export interface CompleteTaskResult {
  completedTaskIds: TaskId[];
  updatedProgressTaskIds: TaskId[];
}

export interface UncompleteTaskResult {
  uncompletedTaskId: TaskId;
  updatedProgressTaskIds: TaskId[];
}

export class TaskRepository {
  constructor(private readonly pool: Pool) {}

  async findById(userId: UserId, taskId: TaskId): Promise<TaskSummary> {
    return this.findSummaryById(userId, taskId);
  }

  async list(userId: UserId, filters: TaskFilters): Promise<TaskSummary[]> {
    const where = ["t.user_id = ?", "t.deleted_at IS NULL"];
    const values: Array<string | number | null> = [Number(userId)];

    if ("parentId" in filters) {
      if (filters.parentId === null) {
        where.push("t.parent_id IS NULL");
      } else {
        where.push("t.parent_id = ?");
        values.push(Number(filters.parentId));
      }
    }

    if (filters.type) {
      where.push("t.type = ?");
      values.push(filters.type);
    }

    if (filters.status) {
      where.push("t.status = ?");
      values.push(filters.status);
    }

    if (filters.from && filters.to) {
      if (filters.includeNoTarget) {
        where.push(
          "(t.target_start_at IS NULL OR t.target_end_at IS NULL OR (t.target_start_at < ? AND t.target_end_at > ?))",
        );
      } else {
        where.push("(t.target_start_at < ? AND t.target_end_at > ?)");
      }
      values.push(filters.to, filters.from);
    }

    const [rows] = await this.pool.execute<TaskRow[]>(
      `
        SELECT ${taskSelectColumns()}
        FROM tasks t
        LEFT JOIN task_progress tp ON tp.task_id = t.id
        WHERE ${where.join(" AND ")}
        ORDER BY t.level ASC, t.parent_id ASC, t.id ASC
      `,
      values,
    );

    return rows.map(toTaskSummary);
  }

  async tree(userId: UserId): Promise<TaskTreeNode[]> {
    const tasks = await this.list(userId, {});
    const byParentId = new Map<string | null, TaskTreeNode[]>();

    for (const task of tasks) {
      byParentId.set(task.id, []);
    }

    for (const task of tasks) {
      const node: TaskTreeNode = {
        ...task,
        children: byParentId.get(task.id) ?? [],
      };
      const siblings = byParentId.get(task.parentId) ?? [];
      siblings.push(node);
      byParentId.set(task.parentId, siblings);
    }

    return byParentId.get(null) ?? [];
  }

  async createRoot(userId: UserId, input: CreateTaskRequest): Promise<TaskSummary> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `
        INSERT INTO tasks (
          user_id, parent_id, type, title, description, why, level, status,
          target_start_at, target_end_at
        )
        VALUES (?, NULL, ?, ?, ?, ?, 1, 'todo', ?, ?)
      `,
      [
        Number(userId),
        input.type,
        input.title,
        input.description,
        input.why,
        toDbDateTime(input.targetStartAt),
        toDbDateTime(input.targetEndAt),
      ],
    );

    await this.refreshProgress(userId, [String(result.insertId)]);
    return this.findSummaryById(userId, String(result.insertId));
  }

  async createChild(
    userId: UserId,
    parentId: TaskId,
    input: CreateTaskRequest,
  ): Promise<TaskSummary> {
    const parent = await this.findTaskById(userId, parentId);
    const now = new Date().toISOString();
    const child = createChildTask(parent, {
      id: "0",
      userId,
      type: input.type,
      title: input.title,
      description: input.description,
      why: input.why,
      targetStartAt: input.targetStartAt,
      targetEndAt: input.targetEndAt,
      now,
    });

    const [result] = await this.pool.execute<ResultSetHeader>(
      `
        INSERT INTO tasks (
          user_id, parent_id, type, title, description, why, level, status,
          target_start_at, target_end_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?)
      `,
      [
        Number(userId),
        Number(parentId),
        child.type,
        child.title,
        child.description,
        child.why,
        child.level,
        toDbDateTime(child.targetStartAt),
        toDbDateTime(child.targetEndAt),
      ],
    );

    await this.refreshProgressForTaskAndAncestors(userId, String(result.insertId));
    return this.findSummaryById(userId, String(result.insertId));
  }

  async update(
    userId: UserId,
    taskId: TaskId,
    input: UpdateTaskRequest,
  ): Promise<TaskSummary> {
    const current = await this.findTaskById(userId, taskId);
    assertValidTargetRange(
      input.targetStartAt === undefined ? current.targetStartAt : input.targetStartAt,
      input.targetEndAt === undefined ? current.targetEndAt : input.targetEndAt,
    );

    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    addField(fields, values, "type", input.type);
    addField(fields, values, "title", input.title);
    addField(fields, values, "description", input.description);
    addField(fields, values, "why", input.why);
    addField(fields, values, "status", input.status);
    addField(fields, values, "target_start_at", toDbDateTime(input.targetStartAt));
    addField(fields, values, "target_end_at", toDbDateTime(input.targetEndAt));

    if (input.status === "done") {
      fields.push("completed_at = CURRENT_TIMESTAMP(3)");
    } else if (input.status === "todo" || input.status === "active") {
      fields.push("completed_at = NULL");
    }

    if (fields.length > 0) {
      values.push(Number(userId), Number(taskId));
      await this.pool.execute(
        `
          UPDATE tasks
          SET ${fields.join(", ")}
          WHERE user_id = ? AND id = ? AND deleted_at IS NULL
        `,
        values,
      );
    }

    await this.refreshProgressForTaskAndAncestors(userId, taskId);
    return this.findSummaryById(userId, taskId);
  }

  async deleteSubtree(userId: UserId, taskId: TaskId): Promise<void> {
    const tasks = await this.findAllTasks(userId);
    const subtree = findDescendantsIncludingSelf(tasks, taskId);
    const subtreeIds = subtree.map((task) => task.id);
    const ancestors = findAncestors(tasks, taskId).map((task) => task.id);

    await this.pool.execute(
      `
        UPDATE tasks
        SET deleted_at = CURRENT_TIMESTAMP(3)
        WHERE user_id = ? AND id IN (${subtreeIds.map(() => "?").join(", ")})
      `,
      [Number(userId), ...subtreeIds.map(Number)],
    );

    await this.refreshProgress(userId, ancestors);
  }

  async completeSubtree(userId: UserId, taskId: TaskId): Promise<CompleteTaskResult> {
    const tasks = await this.findAllTasks(userId);
    const subtree = findDescendantsIncludingSelf(tasks, taskId);
    const ancestors = findAncestors(tasks, taskId);
    const completedTaskIds = subtree.map((task) => task.id);
    const updatedProgressTaskIds = [...new Set([...completedTaskIds, ...ancestors.map((task) => task.id)])];

    await this.pool.execute(
      `
        UPDATE tasks
        SET status = 'done', completed_at = CURRENT_TIMESTAMP(3)
        WHERE user_id = ? AND id IN (${completedTaskIds.map(() => "?").join(", ")})
      `,
      [Number(userId), ...completedTaskIds.map(Number)],
    );

    await this.refreshProgress(userId, updatedProgressTaskIds);

    return {
      completedTaskIds,
      updatedProgressTaskIds,
    };
  }

  async uncompleteSelfOnly(
    userId: UserId,
    taskId: TaskId,
  ): Promise<UncompleteTaskResult> {
    await this.findTaskById(userId, taskId);
    const tasks = await this.findAllTasks(userId);
    const updatedProgressTaskIds = [
      taskId,
      ...findAncestors(tasks, taskId).map((task) => task.id),
    ];

    await this.pool.execute(
      `
        UPDATE tasks
        SET status = 'todo', completed_at = NULL
        WHERE user_id = ? AND id = ? AND deleted_at IS NULL
      `,
      [Number(userId), Number(taskId)],
    );

    await this.refreshProgress(userId, updatedProgressTaskIds);

    return {
      uncompletedTaskId: taskId,
      updatedProgressTaskIds,
    };
  }

  private async findSummaryById(userId: UserId, taskId: TaskId): Promise<TaskSummary> {
    const [rows] = await this.pool.execute<TaskRow[]>(
      `
        SELECT ${taskSelectColumns()}
        FROM tasks t
        LEFT JOIN task_progress tp ON tp.task_id = t.id
        WHERE t.user_id = ? AND t.id = ? AND t.deleted_at IS NULL
      `,
      [Number(userId), Number(taskId)],
    );

    const row = rows[0];
    if (!row) {
      throw new DomainError("TASK_NOT_FOUND", "Task was not found.");
    }

    return toTaskSummary(row);
  }

  private async findTaskById(userId: UserId, taskId: TaskId): Promise<Task> {
    const [rows] = await this.pool.execute<TaskRow[]>(
      `
        SELECT ${taskSelectColumns()}
        FROM tasks t
        LEFT JOIN task_progress tp ON tp.task_id = t.id
        WHERE t.user_id = ? AND t.id = ? AND t.deleted_at IS NULL
      `,
      [Number(userId), Number(taskId)],
    );

    const row = rows[0];
    if (!row) {
      throw new DomainError("TASK_NOT_FOUND", "Task was not found.");
    }

    return toTask(row);
  }

  private async findAllTasks(userId: UserId): Promise<Task[]> {
    const [rows] = await this.pool.execute<TaskRow[]>(
      `
        SELECT ${taskSelectColumns()}
        FROM tasks t
        LEFT JOIN task_progress tp ON tp.task_id = t.id
        WHERE t.user_id = ? AND t.deleted_at IS NULL
        ORDER BY t.level ASC, t.parent_id ASC, t.id ASC
      `,
      [Number(userId)],
    );

    return rows.map(toTask);
  }

  private async refreshProgressForTaskAndAncestors(
    userId: UserId,
    taskId: TaskId,
  ): Promise<void> {
    const tasks = await this.findAllTasks(userId);
    const taskIds = [taskId, ...findAncestors(tasks, taskId).map((task) => task.id)];
    await this.refreshProgress(userId, taskIds);
  }

  private async refreshProgress(userId: UserId, taskIds: TaskId[]): Promise<void> {
    if (taskIds.length === 0) {
      return;
    }

    const tasks = await this.findAllTasks(userId);

    for (const taskId of taskIds) {
      const progress = recalculateProgressFor(tasks, taskId);
      await this.pool.execute(
        `
          INSERT INTO task_progress (
            task_id, leaf_total_count, leaf_done_count, progress_rate
          )
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            leaf_total_count = VALUES(leaf_total_count),
            leaf_done_count = VALUES(leaf_done_count),
            progress_rate = VALUES(progress_rate)
        `,
        [
          Number(progress.taskId),
          progress.leafTotalCount,
          progress.leafDoneCount,
          progress.progressRate,
        ],
      );
    }
  }
}

function taskSelectColumns(): string {
  return `
    t.id,
    t.user_id,
    t.parent_id,
    t.type,
    t.title,
    t.description,
    t.why,
    t.level,
    t.status,
    t.priority,
    t.target_start_at,
    t.target_end_at,
    t.completed_at,
    t.created_at,
    t.updated_at,
    tp.leaf_total_count,
    tp.leaf_done_count,
    tp.progress_rate
  `;
}

function toTaskSummary(row: TaskRow): TaskSummary {
  return {
    id: String(row.id),
    parentId: row.parent_id === null ? null : String(row.parent_id),
    type: row.type,
    title: row.title,
    description: row.description,
    why: row.why,
    level: row.level,
    status: row.status,
    targetStartAt: fromDbDateTime(row.target_start_at),
    targetEndAt: fromDbDateTime(row.target_end_at),
    progress: {
      leafTotalCount: row.leaf_total_count ?? 0,
      leafDoneCount: row.leaf_done_count ?? 0,
      progressRate: Number(row.progress_rate ?? 0),
    },
  };
}

function toTask(row: TaskRow): Task {
  return {
    ...toTaskSummary(row),
    userId: String(row.user_id),
    priority: row.priority,
    completedAt: fromDbDateTime(row.completed_at),
    createdAt: fromDbDateTime(row.created_at) ?? "",
    updatedAt: fromDbDateTime(row.updated_at) ?? "",
  };
}

function addField(
  fields: string[],
  values: Array<string | number | null>,
  column: string,
  value: string | number | null | undefined,
): void {
  if (value === undefined) {
    return;
  }

  fields.push(`${column} = ?`);
  values.push(value);
}

function toDbDateTime(value: string | null): string | null;
function toDbDateTime(value: string | null | undefined): string | null | undefined;
function toDbDateTime(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return new Date(value).toISOString().slice(0, 23).replace("T", " ");
}

function fromDbDateTime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(`${value.replace(" ", "T")}Z`).toISOString();
}

function assertValidTargetRange(startAt: string | null, endAt: string | null): void {
  if (!startAt || !endAt) {
    return;
  }

  try {
    assertValidPlanTimeRange(startAt, endAt);
  } catch {
    throw new DomainError(
      "VALIDATION_ERROR",
      "targetEndAt must be after targetStartAt.",
    );
  }
}
