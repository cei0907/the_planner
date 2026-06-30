import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import {
  DomainError,
  expandToLeafTasks,
  type CreatePlanRequest,
  type PlanSupplySummary,
  type PlanSummary,
  type PlanTaskSummary,
  type TaskCandidate,
  type TaskId,
  type TaskStatus,
  type TaskTreeItem,
  type TaskType,
  type UpdatePlanRequest,
  type UserId,
} from "@the-planner/shared";
import { fromDbDateTime, toDbDateTime } from "./date-time";

interface PlanRow extends RowDataPacket {
  id: number;
  user_id: number;
  title: string;
  start_at: string;
  end_at: string;
  location: string | null;
  memo: string | null;
  estimated_cost: string | null;
  actual_cost: string | null;
  created_at: string;
  updated_at: string;
}

interface PlanTaskRow extends RowDataPacket {
  plan_task_id: number;
  task_id: number;
  title: string;
  status: "todo" | "done";
  completed_at: string | null;
}

interface PlanSupplyRow extends RowDataPacket {
  id: number;
  title: string;
  is_checked: 0 | 1;
}

interface TaskTreeRow extends TaskTreeItem {
  id: TaskId;
  userId: UserId;
  parentId: TaskId | null;
  level: number;
  status: TaskStatus;
  title: string;
  type: TaskType;
  targetStartAt: string | null;
  targetEndAt: string | null;
}

export class PlanRepository {
  constructor(private readonly pool: Pool) {}

  async list(userId: UserId, from: string, to: string): Promise<PlanSummary[]> {
    const [rows] = await this.pool.execute<PlanRow[]>(
      `
        SELECT *
        FROM plans
        WHERE user_id = ?
          AND deleted_at IS NULL
          AND start_at < ?
          AND end_at > ?
        ORDER BY start_at ASC, id ASC
      `,
      [Number(userId), toDbDateTime(to), toDbDateTime(from)],
    );

    return Promise.all(rows.map((row) => this.hydratePlan(row)));
  }

  async findById(userId: UserId, planId: string): Promise<PlanSummary> {
    return this.hydratePlan(await this.findPlanRow(userId, planId));
  }

  async create(userId: UserId, input: CreatePlanRequest): Promise<PlanSummary> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `
        INSERT INTO plans (
          user_id, title, start_at, end_at, location, memo, estimated_cost
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(userId),
        input.title,
        toDbDateTime(input.startAt),
        toDbDateTime(input.endAt),
        input.location,
        input.memo,
        input.estimatedCost,
      ],
    );

    return this.findById(userId, String(result.insertId));
  }

  async update(
    userId: UserId,
    planId: string,
    input: UpdatePlanRequest,
  ): Promise<PlanSummary> {
    const current = await this.findPlanRow(userId, planId);
    const startAt = input.startAt ?? fromDbDateTime(current.start_at);
    const endAt = input.endAt ?? fromDbDateTime(current.end_at);

    if (!startAt || !endAt || new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      throw new DomainError("PLAN_INVALID_TIME_RANGE", "Plan endAt must be after startAt.");
    }

    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    addField(fields, values, "title", input.title);
    addField(fields, values, "start_at", toDbDateTime(input.startAt));
    addField(fields, values, "end_at", toDbDateTime(input.endAt));
    addField(fields, values, "location", input.location);
    addField(fields, values, "memo", input.memo);
    addField(fields, values, "estimated_cost", input.estimatedCost);
    addField(fields, values, "actual_cost", input.actualCost);

    if (fields.length > 0) {
      values.push(Number(userId), Number(planId));
      await this.pool.execute(
        `
          UPDATE plans
          SET ${fields.join(", ")}
          WHERE user_id = ? AND id = ? AND deleted_at IS NULL
        `,
        values,
      );
    }

    return this.findById(userId, planId);
  }

  async delete(userId: UserId, planId: string): Promise<void> {
    await this.findPlanRow(userId, planId);
    await this.pool.execute(
      "DELETE FROM plan_tasks WHERE user_id = ? AND plan_id = ?",
      [Number(userId), Number(planId)],
    );
    await this.pool.execute(
      "DELETE FROM plan_supplies WHERE user_id = ? AND plan_id = ?",
      [Number(userId), Number(planId)],
    );
    await this.pool.execute(
      `
        UPDATE plans
        SET deleted_at = CURRENT_TIMESTAMP(3)
        WHERE user_id = ? AND id = ? AND deleted_at IS NULL
      `,
      [Number(userId), Number(planId)],
    );
  }

  async taskCandidates(
    userId: UserId,
    planId: string,
    q: string | null,
    includeNoTarget: boolean,
  ): Promise<TaskCandidate[]> {
    const plan = await this.findPlanRow(userId, planId);
    const tasks = await this.findAllTaskTreeRows(userId);
    const childCounts = countChildren(tasks);
    const leafCounts = countLeafDescendants(tasks);
    const query = q?.trim().toLowerCase() ?? "";

    return tasks
      .filter((task) => {
        if (query && !task.title.toLowerCase().includes(query)) {
          return false;
        }

        if (!task.targetStartAt || !task.targetEndAt) {
          return includeNoTarget;
        }

        return rangesOverlap(task.targetStartAt, task.targetEndAt, plan.start_at, plan.end_at);
      })
      .map((task) => ({
        id: task.id,
        title: task.title,
        type: task.type,
        level: task.level,
        isLeaf: (childCounts.get(task.id) ?? 0) === 0,
        leafCount: leafCounts.get(task.id) ?? 1,
        targetStartAt: fromDbDateTime(task.targetStartAt),
        targetEndAt: fromDbDateTime(task.targetEndAt),
      }));
  }

  async addTaskToPlan(
    userId: UserId,
    planId: string,
    taskId: TaskId,
  ): Promise<PlanTaskSummary[]> {
    await this.findPlanRow(userId, planId);
    const tasks = await this.findAllTaskTreeRows(userId);
    const leafTasks = expandToLeafTasks(tasks, taskId);
    const [existingRows] = await this.pool.execute<RowDataPacket[]>(
      `
        SELECT task_id
        FROM plan_tasks
        WHERE user_id = ? AND plan_id = ? AND repeat_occurrence_id IS NULL
      `,
      [Number(userId), Number(planId)],
    );
    const existingTaskIds = new Set(existingRows.map((row) => String(row.task_id)));
    const createdIds: string[] = [];

    for (const task of leafTasks) {
      if (existingTaskIds.has(task.id)) {
        continue;
      }

      const [result] = await this.pool.execute<ResultSetHeader>(
        `
          INSERT INTO plan_tasks (user_id, plan_id, task_id, status)
          VALUES (?, ?, ?, 'todo')
        `,
        [Number(userId), Number(planId), Number(task.id)],
      );
      createdIds.push(String(result.insertId));
    }

    if (createdIds.length === 0) {
      return [];
    }

    return this.findPlanTasksByIds(userId, createdIds);
  }

  async checkPlanTask(userId: UserId, planTaskId: string): Promise<PlanTaskSummary> {
    await this.findPlanTaskById(userId, planTaskId);
    await this.pool.execute(
      `
        UPDATE plan_tasks
        SET status = 'done', completed_at = CURRENT_TIMESTAMP(3)
        WHERE user_id = ? AND id = ?
      `,
      [Number(userId), Number(planTaskId)],
    );

    return this.findPlanTaskById(userId, planTaskId);
  }

  async uncheckPlanTask(userId: UserId, planTaskId: string): Promise<PlanTaskSummary> {
    await this.findPlanTaskById(userId, planTaskId);
    await this.pool.execute(
      `
        UPDATE plan_tasks
        SET status = 'todo', completed_at = NULL
        WHERE user_id = ? AND id = ?
      `,
      [Number(userId), Number(planTaskId)],
    );

    return this.findPlanTaskById(userId, planTaskId);
  }

  async deletePlanTask(userId: UserId, planTaskId: string): Promise<void> {
    await this.findPlanTaskById(userId, planTaskId);
    await this.pool.execute(
      "DELETE FROM plan_tasks WHERE user_id = ? AND id = ?",
      [Number(userId), Number(planTaskId)],
    );
  }

  async addSupply(
    userId: UserId,
    planId: string,
    title: string,
  ): Promise<PlanSupplySummary> {
    await this.findPlanRow(userId, planId);
    const [result] = await this.pool.execute<ResultSetHeader>(
      `
        INSERT INTO plan_supplies (user_id, plan_id, title)
        VALUES (?, ?, ?)
      `,
      [Number(userId), Number(planId), title],
    );

    return this.findSupplyById(userId, String(result.insertId));
  }

  async updateSupply(
    userId: UserId,
    supplyId: string,
    input: { title?: string; isChecked?: boolean },
  ): Promise<PlanSupplySummary> {
    await this.findSupplyById(userId, supplyId);
    const fields: string[] = [];
    const values: Array<string | number | boolean> = [];

    addField(fields, values, "title", input.title);
    addField(fields, values, "is_checked", input.isChecked);

    if (fields.length > 0) {
      values.push(Number(userId), Number(supplyId));
      await this.pool.execute(
        `
          UPDATE plan_supplies
          SET ${fields.join(", ")}
          WHERE user_id = ? AND id = ?
        `,
        values,
      );
    }

    return this.findSupplyById(userId, supplyId);
  }

  async deleteSupply(userId: UserId, supplyId: string): Promise<void> {
    await this.findSupplyById(userId, supplyId);
    await this.pool.execute(
      "DELETE FROM plan_supplies WHERE user_id = ? AND id = ?",
      [Number(userId), Number(supplyId)],
    );
  }

  private async findPlanRow(userId: UserId, planId: string): Promise<PlanRow> {
    const [rows] = await this.pool.execute<PlanRow[]>(
      "SELECT * FROM plans WHERE user_id = ? AND id = ? AND deleted_at IS NULL",
      [Number(userId), Number(planId)],
    );
    const row = rows[0];

    if (!row) {
      throw new DomainError("PLAN_NOT_FOUND", "Plan was not found.");
    }

    return row;
  }

  private async hydratePlan(row: PlanRow): Promise<PlanSummary> {
    const [taskRows] = await this.pool.execute<PlanTaskRow[]>(
      `
        SELECT
          pt.id AS plan_task_id,
          pt.task_id,
          t.title,
          pt.status,
          pt.completed_at
        FROM plan_tasks pt
        JOIN tasks t ON t.id = pt.task_id
        WHERE pt.user_id = ? AND pt.plan_id = ?
        ORDER BY pt.id ASC
      `,
      [row.user_id, row.id],
    );
    const [supplyRows] = await this.pool.execute<PlanSupplyRow[]>(
      `
        SELECT id, title, is_checked
        FROM plan_supplies
        WHERE user_id = ? AND plan_id = ?
        ORDER BY sort_order ASC, id ASC
      `,
      [row.user_id, row.id],
    );

    return {
      id: String(row.id),
      title: row.title,
      startAt: fromDbDateTime(row.start_at) ?? "",
      endAt: fromDbDateTime(row.end_at) ?? "",
      location: row.location,
      memo: row.memo,
      estimatedCost: row.estimated_cost,
      actualCost: row.actual_cost,
      tasks: taskRows.map(toPlanTaskSummary),
      supplies: supplyRows.map(toPlanSupplySummary),
    };
  }

  private async findAllTaskTreeRows(userId: UserId): Promise<TaskTreeRow[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `
        SELECT
          id,
          user_id AS userId,
          parent_id AS parentId,
          level,
          status,
          title,
          type,
          target_start_at AS targetStartAt,
          target_end_at AS targetEndAt
        FROM tasks
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY level ASC, parent_id ASC, id ASC
      `,
      [Number(userId)],
    );

    return rows.map((row) => ({
      id: String(row.id),
      userId: String(row.userId),
      parentId: row.parentId === null ? null : String(row.parentId),
      level: Number(row.level),
      status: row.status as TaskStatus,
      title: row.title,
      type: row.type as TaskType,
      targetStartAt: row.targetStartAt as string | null,
      targetEndAt: row.targetEndAt as string | null,
    }));
  }

  private async findPlanTasksByIds(
    userId: UserId,
    planTaskIds: string[],
  ): Promise<PlanTaskSummary[]> {
    const [rows] = await this.pool.execute<PlanTaskRow[]>(
      `
        SELECT
          pt.id AS plan_task_id,
          pt.task_id,
          t.title,
          pt.status,
          pt.completed_at
        FROM plan_tasks pt
        JOIN tasks t ON t.id = pt.task_id
        WHERE pt.user_id = ?
          AND pt.id IN (${planTaskIds.map(() => "?").join(", ")})
        ORDER BY pt.id ASC
      `,
      [Number(userId), ...planTaskIds.map(Number)],
    );

    return rows.map(toPlanTaskSummary);
  }

  private async findPlanTaskById(
    userId: UserId,
    planTaskId: string,
  ): Promise<PlanTaskSummary> {
    const rows = await this.findPlanTasksByIds(userId, [planTaskId]);
    const planTask = rows[0];

    if (!planTask) {
      throw new DomainError("PLAN_TASK_NOT_FOUND", "PlanTask was not found.");
    }

    return planTask;
  }

  private async findSupplyById(userId: UserId, supplyId: string): Promise<PlanSupplySummary> {
    const [rows] = await this.pool.execute<PlanSupplyRow[]>(
      "SELECT id, title, is_checked FROM plan_supplies WHERE user_id = ? AND id = ?",
      [Number(userId), Number(supplyId)],
    );
    const row = rows[0];

    if (!row) {
      throw new DomainError("PLAN_SUPPLY_NOT_FOUND", "PlanSupply was not found.");
    }

    return toPlanSupplySummary(row);
  }
}

function toPlanTaskSummary(row: PlanTaskRow): PlanTaskSummary {
  return {
    planTaskId: String(row.plan_task_id),
    taskId: String(row.task_id),
    title: row.title,
    status: row.status,
    completedAt: fromDbDateTime(row.completed_at),
  };
}

function toPlanSupplySummary(row: PlanSupplyRow): PlanSupplySummary {
  return {
    id: String(row.id),
    title: row.title,
    isChecked: Boolean(row.is_checked),
  };
}

function addField(
  fields: string[],
  values: Array<string | number | boolean | null>,
  column: string,
  value: string | number | boolean | null | undefined,
): void {
  if (value === undefined) {
    return;
  }

  fields.push(`${column} = ?`);
  values.push(value);
}

function rangesOverlap(
  leftStartAt: string,
  leftEndAt: string,
  rightStartAt: string,
  rightEndAt: string,
): boolean {
  return new Date(`${leftStartAt.replace(" ", "T")}Z`).getTime()
    < new Date(`${rightEndAt.replace(" ", "T")}Z`).getTime()
    && new Date(`${leftEndAt.replace(" ", "T")}Z`).getTime()
    > new Date(`${rightStartAt.replace(" ", "T")}Z`).getTime();
}

function countChildren(tasks: TaskTreeRow[]): Map<string, number> {
  const result = new Map<string, number>();

  for (const task of tasks) {
    if (!task.parentId) {
      continue;
    }

    result.set(task.parentId, (result.get(task.parentId) ?? 0) + 1);
  }

  return result;
}

function countLeafDescendants(tasks: TaskTreeRow[]): Map<string, number> {
  const result = new Map<string, number>();

  for (const task of tasks) {
    result.set(task.id, expandToLeafTasks(tasks, task.id).length);
  }

  return result;
}
