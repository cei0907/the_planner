import {
  DomainError,
  TASK_MAX_LEVEL,
  assertCanAddChild,
  calculateProgress,
  type IsoDateTime,
  type Task,
  type TaskId,
  type TaskProgress,
} from "./domain";

export type TaskTreeItem = Pick<
  Task,
  "id" | "parentId" | "level" | "status" | "userId"
>;

export interface CreateChildTaskInput {
  id: TaskId;
  userId: Task["userId"];
  type: Task["type"];
  title: string;
  description?: string | null;
  why?: string | null;
  priority?: number | null;
  targetStartAt?: IsoDateTime | null;
  targetEndAt?: IsoDateTime | null;
  now: IsoDateTime;
}

export function createChildTask(parent: Task, input: CreateChildTaskInput): Task {
  assertCanAddChild(parent);

  if (parent.userId !== input.userId) {
    throw new DomainError(
      "TASK_INVALID_PARENT",
      "Child task must belong to the same user as its parent.",
    );
  }

  return {
    id: input.id,
    userId: input.userId,
    parentId: parent.id,
    type: input.type,
    title: input.title,
    description: input.description ?? null,
    why: input.why ?? null,
    level: parent.level + 1,
    status: "todo",
    priority: input.priority ?? null,
    targetStartAt: input.targetStartAt ?? null,
    targetEndAt: input.targetEndAt ?? null,
    completedAt: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function findDescendantsIncludingSelf<T extends TaskTreeItem>(
  tasks: readonly T[],
  taskId: TaskId,
): T[] {
  const byParentId = groupByParentId(tasks);
  const root = tasks.find((task) => task.id === taskId);

  if (!root) {
    throw new DomainError("TASK_NOT_FOUND", "Task was not found.");
  }

  const result: T[] = [];
  const stack: T[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    result.push(current);
    stack.push(...(byParentId.get(current.id) ?? []));
  }

  return result;
}

export function findAncestors<T extends TaskTreeItem>(
  tasks: readonly T[],
  taskId: TaskId,
): T[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const task = byId.get(taskId);

  if (!task) {
    throw new DomainError("TASK_NOT_FOUND", "Task was not found.");
  }

  const result: T[] = [];
  let parentId = task.parentId;

  while (parentId) {
    const parent = byId.get(parentId);

    if (!parent) {
      throw new DomainError("TASK_INVALID_PARENT", "Task parent was not found.");
    }

    result.push(parent);
    parentId = parent.parentId;
  }

  return result;
}

export function completeSubtree<T extends TaskTreeItem>(
  tasks: readonly T[],
  taskId: TaskId,
): T[] {
  const subtreeIds = new Set(
    findDescendantsIncludingSelf(tasks, taskId).map((task) => task.id),
  );

  return tasks.map((task) => {
    if (!subtreeIds.has(task.id)) {
      return task;
    }

    return {
      ...task,
      status: "done",
    };
  });
}

export function uncompleteSelfOnly<T extends TaskTreeItem>(
  tasks: readonly T[],
  taskId: TaskId,
): T[] {
  assertTaskExists(tasks, taskId);

  return tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    return {
      ...task,
      status: "todo",
    };
  });
}

export function expandToLeafTasks<T extends TaskTreeItem>(
  tasks: readonly T[],
  taskId: TaskId,
): T[] {
  const subtree = findDescendantsIncludingSelf(tasks, taskId);
  const childCounts = countChildren(tasks);
  const leafTasks = subtree.filter((task) => (childCounts.get(task.id) ?? 0) === 0);

  return leafTasks.length > 0 ? leafTasks : subtree;
}

export function recalculateProgressFor<T extends TaskTreeItem>(
  tasks: readonly T[],
  taskId: TaskId,
): TaskProgress {
  const leafTasks = expandToLeafTasks(tasks, taskId);
  const leafTotalCount = leafTasks.length;
  const leafDoneCount = leafTasks.filter((task) => task.status === "done").length;

  return {
    taskId,
    leafTotalCount,
    leafDoneCount,
    progressRate: calculateProgress(leafTotalCount, leafDoneCount),
    updatedAt: new Date(0).toISOString(),
  };
}

export function validateTaskTreeDepth<T extends TaskTreeItem>(tasks: readonly T[]): void {
  for (const task of tasks) {
    if (task.level < 1 || task.level > TASK_MAX_LEVEL) {
      throw new DomainError(
        "TASK_INVALID_LEVEL",
        "Task level must be between 1 and 5.",
      );
    }
  }
}

function groupByParentId<T extends TaskTreeItem>(tasks: readonly T[]): Map<TaskId, T[]> {
  const result = new Map<TaskId, T[]>();

  for (const task of tasks) {
    if (!task.parentId) {
      continue;
    }

    const children = result.get(task.parentId) ?? [];
    children.push(task);
    result.set(task.parentId, children);
  }

  return result;
}

function countChildren<T extends TaskTreeItem>(tasks: readonly T[]): Map<TaskId, number> {
  const result = new Map<TaskId, number>();

  for (const task of tasks) {
    if (!task.parentId) {
      continue;
    }

    result.set(task.parentId, (result.get(task.parentId) ?? 0) + 1);
  }

  return result;
}

function assertTaskExists<T extends TaskTreeItem>(
  tasks: readonly T[],
  taskId: TaskId,
): void {
  if (!tasks.some((task) => task.id === taskId)) {
    throw new DomainError("TASK_NOT_FOUND", "Task was not found.");
  }
}
