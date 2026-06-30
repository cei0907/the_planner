import { describe, expect, it } from "vitest";
import { DomainError, type Task } from "./domain";
import {
  completeSubtree,
  createChildTask,
  expandToLeafTasks,
  recalculateProgressFor,
  uncompleteSelfOnly,
  validateTaskTreeDepth,
} from "./task-tree";

const now = "2026-06-30T00:00:00.000Z";

function task(input: Partial<Task> & Pick<Task, "id" | "parentId" | "level">): Task {
  return {
    id: input.id,
    userId: input.userId ?? "user-1",
    parentId: input.parentId,
    type: input.type ?? "task",
    title: input.title ?? input.id,
    description: input.description ?? null,
    why: input.why ?? null,
    level: input.level,
    status: input.status ?? "todo",
    priority: input.priority ?? null,
    targetStartAt: input.targetStartAt ?? null,
    targetEndAt: input.targetEndAt ?? null,
    completedAt: input.completedAt ?? null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

describe("Task tree domain rules", () => {
  it("creates a child task at parent level + 1", () => {
    const parent = task({ id: "project-1", parentId: null, level: 1, type: "project" });

    const child = createChildTask(parent, {
      id: "task-1",
      userId: "user-1",
      type: "task",
      title: "1강 듣기",
      now,
    });

    expect(child.parentId).toBe(parent.id);
    expect(child.level).toBe(2);
    expect(child.status).toBe("todo");
  });

  it("rejects children below level 5", () => {
    const parent = task({ id: "level-5", parentId: "level-4", level: 5 });

    expect(() =>
      createChildTask(parent, {
        id: "too-deep",
        userId: "user-1",
        type: "task",
        title: "too deep",
        now,
      }),
    ).toThrowError(DomainError);
  });

  it("validates every task stays within the 1 to 5 level range", () => {
    expect(() =>
      validateTaskTreeDepth([
        task({ id: "root", parentId: null, level: 1 }),
        task({ id: "too-deep", parentId: "root", level: 6 }),
      ]),
    ).toThrowError(DomainError);
  });

  it("completes the selected task and every descendant without touching siblings", () => {
    const tasks = [
      task({ id: "root", parentId: null, level: 1 }),
      task({ id: "child-1", parentId: "root", level: 2 }),
      task({ id: "leaf-1", parentId: "child-1", level: 3 }),
      task({ id: "sibling", parentId: null, level: 1 }),
    ];

    const result = completeSubtree(tasks, "child-1");

    expect(result.find((item) => item.id === "root")?.status).toBe("todo");
    expect(result.find((item) => item.id === "child-1")?.status).toBe("done");
    expect(result.find((item) => item.id === "leaf-1")?.status).toBe("done");
    expect(result.find((item) => item.id === "sibling")?.status).toBe("todo");
  });

  it("uncompletes only the selected task", () => {
    const tasks = [
      task({ id: "root", parentId: null, level: 1, status: "done" }),
      task({ id: "leaf", parentId: "root", level: 2, status: "done" }),
    ];

    const result = uncompleteSelfOnly(tasks, "root");

    expect(result.find((item) => item.id === "root")?.status).toBe("todo");
    expect(result.find((item) => item.id === "leaf")?.status).toBe("done");
  });

  it("calculates progress from leaf tasks only", () => {
    const tasks = [
      task({ id: "root", parentId: null, level: 1 }),
      task({ id: "branch", parentId: "root", level: 2, status: "done" }),
      task({ id: "leaf-1", parentId: "branch", level: 3, status: "done" }),
      task({ id: "leaf-2", parentId: "branch", level: 3, status: "todo" }),
    ];

    const progress = recalculateProgressFor(tasks, "root");

    expect(progress.leafTotalCount).toBe(2);
    expect(progress.leafDoneCount).toBe(1);
    expect(progress.progressRate).toBe(0.5);
  });

  it("expands a parent task into leaf tasks for PlanTask creation", () => {
    const tasks = [
      task({ id: "trip", parentId: null, level: 1, type: "project" }),
      task({ id: "transport", parentId: "trip", level: 2 }),
      task({ id: "packing", parentId: "trip", level: 2 }),
      task({ id: "camera", parentId: "packing", level: 3 }),
    ];

    const leafTasks = expandToLeafTasks(tasks, "trip");

    expect(leafTasks.map((item) => item.id).sort()).toEqual(["camera", "transport"]);
  });

  it("keeps a level 1 task as the execution unit when it has no children", () => {
    const tasks = [task({ id: "go-bank", parentId: null, level: 1 })];

    expect(expandToLeafTasks(tasks, "go-bank").map((item) => item.id)).toEqual([
      "go-bank",
    ]);
  });
});
