export type EntityId = string;
export type UserId = EntityId;
export type TaskId = EntityId;
export type PlanId = EntityId;
export type PlanTaskId = EntityId;
export type RepeatRuleId = EntityId;
export type RepeatOccurrenceId = EntityId;

export type IsoDateTime = string;
export type MoneyDecimal = string;

export type TaskType = "task" | "project" | "aspiration";
export type TaskStatus = "todo" | "active" | "done";
export type PlanTaskStatus = "todo" | "done";
export type RepeatFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type RepeatEndType = "never" | "until_date" | "count";
export type RepeatOccurrenceStatus = "todo" | "done" | "skipped";
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const TASK_MAX_LEVEL = 5;

export interface User {
  id: UserId;
  email: string;
  displayName: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Task {
  id: TaskId;
  userId: UserId;
  parentId: TaskId | null;
  type: TaskType;
  title: string;
  description: string | null;
  why: string | null;
  level: number;
  status: TaskStatus;
  priority: number | null;
  targetStartAt: IsoDateTime | null;
  targetEndAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface TaskProgress {
  taskId: TaskId;
  leafTotalCount: number;
  leafDoneCount: number;
  progressRate: number;
  updatedAt: IsoDateTime;
}

export interface Plan {
  id: PlanId;
  userId: UserId;
  title: string;
  startAt: IsoDateTime;
  endAt: IsoDateTime;
  location: string | null;
  memo: string | null;
  estimatedCost: MoneyDecimal | null;
  actualCost: MoneyDecimal | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PlanTask {
  id: PlanTaskId;
  userId: UserId;
  planId: PlanId;
  taskId: TaskId;
  repeatOccurrenceId: RepeatOccurrenceId | null;
  status: PlanTaskStatus;
  completedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PlanSupply {
  id: EntityId;
  userId: UserId;
  planId: PlanId;
  title: string;
  isChecked: boolean;
  sortOrder: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RepeatRule {
  id: RepeatRuleId;
  userId: UserId;
  taskId: TaskId;
  frequency: RepeatFrequency;
  intervalValue: number;
  weekdays: Weekday[] | null;
  endType: RepeatEndType;
  endAt: IsoDateTime | null;
  occurrenceCount: number | null;
  defaultStartTime: string | null;
  defaultEndTime: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RepeatOccurrence {
  id: RepeatOccurrenceId;
  userId: UserId;
  repeatRuleId: RepeatRuleId;
  scheduledStartAt: IsoDateTime;
  scheduledEndAt: IsoDateTime;
  status: RepeatOccurrenceStatus;
  completedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function canTaskHaveChild(task: Pick<Task, "level">): boolean {
  return task.level < TASK_MAX_LEVEL;
}

export function assertCanAddChild(parent: Pick<Task, "level">): void {
  if (!canTaskHaveChild(parent)) {
    throw new DomainError(
      "TASK_MAX_DEPTH_EXCEEDED",
      "Level5 Task cannot have child tasks.",
    );
  }
}

export function getChildLevel(parent: Pick<Task, "level">): number {
  assertCanAddChild(parent);
  return parent.level + 1;
}

export function isLeafTask(childrenCount: number): boolean {
  return childrenCount === 0;
}

export function calculateProgress(leafTotalCount: number, leafDoneCount: number): number {
  if (leafTotalCount <= 0) {
    return 0;
  }

  return leafDoneCount / leafTotalCount;
}

export function assertValidPlanTimeRange(startAt: IsoDateTime, endAt: IsoDateTime): void {
  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    throw new DomainError(
      "PLAN_INVALID_TIME_RANGE",
      "Plan endAt must be after startAt.",
    );
  }
}

export function rangesOverlap(
  leftStartAt: IsoDateTime,
  leftEndAt: IsoDateTime,
  rightStartAt: IsoDateTime,
  rightEndAt: IsoDateTime,
): boolean {
  return new Date(leftStartAt).getTime() < new Date(rightEndAt).getTime()
    && new Date(leftEndAt).getTime() > new Date(rightStartAt).getTime();
}

export function taskTargetOverlapsPlan(
  task: Pick<Task, "targetStartAt" | "targetEndAt">,
  plan: Pick<Plan, "startAt" | "endAt">,
): boolean {
  if (!task.targetStartAt || !task.targetEndAt) {
    return false;
  }

  return rangesOverlap(task.targetStartAt, task.targetEndAt, plan.startAt, plan.endAt);
}

export function isFiniteRepeatRule(rule: Pick<RepeatRule, "endType">): boolean {
  return rule.endType === "until_date" || rule.endType === "count";
}

export function isEndlessRepeatRule(rule: Pick<RepeatRule, "endType">): boolean {
  return rule.endType === "never";
}
