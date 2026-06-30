import { Router } from "express";
import type { Pool } from "mysql2/promise";
import {
  DomainError,
  assertValidPlanTimeRange,
  type CreateTaskRequest,
  type TaskStatus,
  type TaskType,
  type UpdateTaskRequest,
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

  router.get(
    "/:taskId",
    asyncHandler(async (request, response) => {
      response.json(
        await tasks.findById(
          DEVELOPMENT_USER_ID,
          requiredTaskId(request.params.taskId),
        ),
      );
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
        requiredTaskId(request.params.taskId),
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
          requiredTaskId(request.params.taskId),
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
        requiredTaskId(request.params.taskId),
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
          requiredTaskId(request.params.taskId),
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
          requiredTaskId(request.params.taskId),
        ),
      );
    }),
  );

  return router;
}

function requiredTaskId(value: string | string[] | undefined): string {
  const taskId = requiredParam(value, "taskId");

  if (!/^[1-9]\d*$/.test(taskId)) {
    throwValidationError("taskId must be a positive integer.");
  }

  return taskId;
}

function requiredParam(value: string | string[] | undefined, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throwValidationError(`${name} is required.`);
  }

  return value;
}

function parseTaskFilters(query: Record<string, unknown>): TaskFilters {
  const filters: TaskFilters = {};

  if (typeof query.parentId === "string") {
    if (query.parentId === "null") {
      filters.parentId = null;
    } else if (/^[1-9]\d*$/.test(query.parentId)) {
      filters.parentId = query.parentId;
    } else {
      throwValidationError("parentId must be a positive integer or null.");
    }
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
    throwValidationError("type must be one of task, project, aspiration.");
  }

  if (typeof input.title !== "string" || input.title.trim() === "") {
    throwValidationError("title is required.");
  }

  const request = {
    type: input.type,
    title: input.title.trim(),
    description: nullableString(input.description),
    why: nullableString(input.why),
    targetStartAt: nullableDateTime(input.targetStartAt, "targetStartAt"),
    targetEndAt: nullableDateTime(input.targetEndAt, "targetEndAt"),
  };

  assertValidTargetRange(request.targetStartAt, request.targetEndAt);

  return request;
}

function parseUpdateTaskRequest(body: unknown): UpdateTaskRequest {
  const input = asRecord(body);
  const result: UpdateTaskRequest = {};

  if ("type" in input) {
    if (!isTaskType(input.type)) {
      throwValidationError("type must be one of task, project, aspiration.");
    }
    result.type = input.type;
  }

  if ("title" in input) {
    if (typeof input.title !== "string" || input.title.trim() === "") {
      throwValidationError("title must be a non-empty string.");
    }
    result.title = input.title.trim();
  }

  if ("description" in input) {
    result.description = nullableString(input.description);
  }

  if ("why" in input) {
    result.why = nullableString(input.why);
  }

  if ("status" in input) {
    if (!isTaskStatus(input.status)) {
      throwValidationError("status must be one of todo, active, done.");
    }
    result.status = input.status;
  }

  if ("targetStartAt" in input) {
    result.targetStartAt = nullableDateTime(input.targetStartAt, "targetStartAt");
  }

  if ("targetEndAt" in input) {
    result.targetEndAt = nullableDateTime(input.targetEndAt, "targetEndAt");
  }

  assertValidPartialTargetRange(result.targetStartAt, result.targetEndAt);

  return result;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throwValidationError("Request body must be an object.");
  }

  return value as Record<string, unknown>;
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throwValidationError("Expected string or null.");
  }

  return value.trim() === "" ? null : value;
}

function nullableDateTime(value: unknown, fieldName: string): string | null {
  const dateTime = nullableString(value);

  if (!dateTime) {
    return null;
  }

  if (Number.isNaN(Date.parse(dateTime))) {
    throwValidationError(`${fieldName} must be a valid date-time string.`);
  }

  return new Date(dateTime).toISOString();
}

function isTaskType(value: unknown): value is TaskType {
  return value === "task" || value === "project" || value === "aspiration";
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "todo" || value === "active" || value === "done";
}

function assertValidTargetRange(startAt: string | null, endAt: string | null): void {
  if (!startAt || !endAt) {
    return;
  }

  try {
    assertValidPlanTimeRange(startAt, endAt);
  } catch {
    throwValidationError("targetEndAt must be after targetStartAt.");
  }
}

function assertValidPartialTargetRange(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
): void {
  if (startAt === undefined || endAt === undefined) {
    return;
  }

  assertValidTargetRange(startAt, endAt);
}

function throwValidationError(message: string): never {
  throw new DomainError("VALIDATION_ERROR", message);
}
