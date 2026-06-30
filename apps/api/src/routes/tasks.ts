import { Router } from "express";
import type { Pool } from "mysql2/promise";
import type {
  CreateTaskRequest,
  TaskStatus,
  TaskType,
  UpdateTaskRequest,
} from "@the-planner/shared";
import { asyncHandler } from "../http";
import { TaskRepository, type TaskFilters } from "../repositories/task-repository";

const DEVELOPMENT_USER_ID = "1";

export function createTaskRouter(pool: Pool): Router {
  const router = Router();
  const tasks = new TaskRepository(pool);

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      response.json({
        items: await tasks.list(DEVELOPMENT_USER_ID, parseTaskFilters(request.query)),
      });
    }),
  );

  router.get(
    "/tree",
    asyncHandler(async (_request, response) => {
      response.json({
        items: await tasks.tree(DEVELOPMENT_USER_ID),
      });
    }),
  );

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const created = await tasks.createRoot(
        DEVELOPMENT_USER_ID,
        parseCreateTaskRequest(request.body),
      );

      response.status(201).json(created);
    }),
  );

  router.post(
    "/:taskId/children",
    asyncHandler(async (request, response) => {
      const created = await tasks.createChild(
        DEVELOPMENT_USER_ID,
        requiredParam(request.params.taskId, "taskId"),
        parseCreateTaskRequest(request.body),
      );

      response.status(201).json(created);
    }),
  );

  router.patch(
    "/:taskId",
    asyncHandler(async (request, response) => {
      response.json(
        await tasks.update(
          DEVELOPMENT_USER_ID,
          requiredParam(request.params.taskId, "taskId"),
          parseUpdateTaskRequest(request.body),
        ),
      );
    }),
  );

  router.delete(
    "/:taskId",
    asyncHandler(async (request, response) => {
      await tasks.deleteSubtree(
        DEVELOPMENT_USER_ID,
        requiredParam(request.params.taskId, "taskId"),
      );
      response.status(204).send();
    }),
  );

  router.post(
    "/:taskId/complete",
    asyncHandler(async (request, response) => {
      response.json(
        await tasks.completeSubtree(
          DEVELOPMENT_USER_ID,
          requiredParam(request.params.taskId, "taskId"),
        ),
      );
    }),
  );

  router.post(
    "/:taskId/uncomplete",
    asyncHandler(async (request, response) => {
      response.json(
        await tasks.uncompleteSelfOnly(
          DEVELOPMENT_USER_ID,
          requiredParam(request.params.taskId, "taskId"),
        ),
      );
    }),
  );

  return router;
}

function requiredParam(value: string | string[] | undefined, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function parseTaskFilters(query: Record<string, unknown>): TaskFilters {
  const filters: TaskFilters = {};

  if (typeof query.parentId === "string") {
    filters.parentId = query.parentId === "null" ? null : query.parentId;
  }

  if (isTaskType(query.type)) {
    filters.type = query.type;
  }

  if (isTaskStatus(query.status)) {
    filters.status = query.status;
  }

  if (typeof query.from === "string") {
    filters.from = query.from;
  }

  if (typeof query.to === "string") {
    filters.to = query.to;
  }

  filters.includeNoTarget = query.includeNoTarget === "true";

  return filters;
}

function parseCreateTaskRequest(body: unknown): CreateTaskRequest {
  const input = asRecord(body);

  if (!isTaskType(input.type)) {
    throw new Error("type must be one of task, project, aspiration.");
  }

  if (typeof input.title !== "string" || input.title.trim() === "") {
    throw new Error("title is required.");
  }

  return {
    type: input.type,
    title: input.title,
    description: nullableString(input.description),
    why: nullableString(input.why),
    targetStartAt: nullableString(input.targetStartAt),
    targetEndAt: nullableString(input.targetEndAt),
  };
}

function parseUpdateTaskRequest(body: unknown): UpdateTaskRequest {
  const input = asRecord(body);
  const result: UpdateTaskRequest = {};

  if ("type" in input) {
    if (!isTaskType(input.type)) {
      throw new Error("type must be one of task, project, aspiration.");
    }
    result.type = input.type;
  }

  if ("title" in input) {
    if (typeof input.title !== "string" || input.title.trim() === "") {
      throw new Error("title must be a non-empty string.");
    }
    result.title = input.title;
  }

  if ("description" in input) {
    result.description = nullableString(input.description);
  }

  if ("why" in input) {
    result.why = nullableString(input.why);
  }

  if ("status" in input) {
    if (!isTaskStatus(input.status)) {
      throw new Error("status must be one of todo, active, done.");
    }
    result.status = input.status;
  }

  if ("targetStartAt" in input) {
    result.targetStartAt = nullableString(input.targetStartAt);
  }

  if ("targetEndAt" in input) {
    result.targetEndAt = nullableString(input.targetEndAt);
  }

  return result;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Request body must be an object.");
  }

  return value as Record<string, unknown>;
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Expected string or null.");
  }

  return value;
}

function isTaskType(value: unknown): value is TaskType {
  return value === "task" || value === "project" || value === "aspiration";
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "todo" || value === "active" || value === "done";
}
