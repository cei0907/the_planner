import { Router } from "express";
import type { Pool } from "mysql2/promise";
import {
  DomainError,
  assertValidPlanTimeRange,
  type CreatePlanRequest,
  type UpdatePlanRequest,
} from "@the-planner/shared";
import { asyncHandler } from "../http";
import { PlanRepository } from "../repositories/plan-repository";

const DEVELOPMENT_USER_ID = "1";

export function createPlanRouter(pool: Pool): Router {
  const router = Router();
  const plans = new PlanRepository(pool);

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const from = requiredDateTimeQuery(request.query.from, "from");
      const to = requiredDateTimeQuery(request.query.to, "to");
      assertValidDateRange(from, to);

      response.json({
        items: await plans.list(DEVELOPMENT_USER_ID, from, to),
      });
    }),
  );

  router.get(
    "/:planId/task-candidates",
    asyncHandler(async (request, response) => {
      response.json({
        items: await plans.taskCandidates(
          DEVELOPMENT_USER_ID,
          requiredPositiveId(request.params.planId, "planId"),
          typeof request.query.q === "string" ? request.query.q : null,
          request.query.includeNoTarget === "true",
        ),
      });
    }),
  );

  router.post(
    "/:planId/tasks",
    asyncHandler(async (request, response) => {
      const input = asRecord(request.body);
      const taskId = requiredPositiveId(input.taskId, "taskId");

      response.status(201).json({
        items: await plans.addTaskToPlan(
          DEVELOPMENT_USER_ID,
          requiredPositiveId(request.params.planId, "planId"),
          taskId,
        ),
      });
    }),
  );

  router.get(
    "/:planId",
    asyncHandler(async (request, response) => {
      response.json(
        await plans.findById(
          DEVELOPMENT_USER_ID,
          requiredPositiveId(request.params.planId, "planId"),
        ),
      );
    }),
  );

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const created = await plans.create(
        DEVELOPMENT_USER_ID,
        parseCreatePlanRequest(request.body),
      );

      response.status(201).json(created);
    }),
  );

  router.patch(
    "/:planId",
    asyncHandler(async (request, response) => {
      response.json(
        await plans.update(
          DEVELOPMENT_USER_ID,
          requiredPositiveId(request.params.planId, "planId"),
          parseUpdatePlanRequest(request.body),
        ),
      );
    }),
  );

  router.delete(
    "/:planId",
    asyncHandler(async (request, response) => {
      await plans.delete(
        DEVELOPMENT_USER_ID,
        requiredPositiveId(request.params.planId, "planId"),
      );
      response.status(204).send();
    }),
  );

  router.post(
    "/:planId/supplies",
    asyncHandler(async (request, response) => {
      const input = asRecord(request.body);
      const title = requiredTitle(input.title);
      const supply = await plans.addSupply(
        DEVELOPMENT_USER_ID,
        requiredPositiveId(request.params.planId, "planId"),
        title,
      );

      response.status(201).json(supply);
    }),
  );

  return router;
}

export function createPlanTaskRouter(pool: Pool): Router {
  const router = Router();
  const plans = new PlanRepository(pool);

  router.post(
    "/:planTaskId/check",
    asyncHandler(async (request, response) => {
      response.json({
        planTask: await plans.checkPlanTask(
          DEVELOPMENT_USER_ID,
          requiredPositiveId(request.params.planTaskId, "planTaskId"),
        ),
        taskStatusChanged: false,
      });
    }),
  );

  router.post(
    "/:planTaskId/uncheck",
    asyncHandler(async (request, response) => {
      response.json({
        planTask: await plans.uncheckPlanTask(
          DEVELOPMENT_USER_ID,
          requiredPositiveId(request.params.planTaskId, "planTaskId"),
        ),
        taskStatusChanged: false,
      });
    }),
  );

  router.delete(
    "/:planTaskId",
    asyncHandler(async (request, response) => {
      await plans.deletePlanTask(
        DEVELOPMENT_USER_ID,
        requiredPositiveId(request.params.planTaskId, "planTaskId"),
      );
      response.status(204).send();
    }),
  );

  return router;
}

export function createPlanSupplyRouter(pool: Pool): Router {
  const router = Router();
  const plans = new PlanRepository(pool);

  router.patch(
    "/:supplyId",
    asyncHandler(async (request, response) => {
      response.json(
        await plans.updateSupply(
          DEVELOPMENT_USER_ID,
          requiredPositiveId(request.params.supplyId, "supplyId"),
          parseUpdateSupplyRequest(request.body),
        ),
      );
    }),
  );

  router.delete(
    "/:supplyId",
    asyncHandler(async (request, response) => {
      await plans.deleteSupply(
        DEVELOPMENT_USER_ID,
        requiredPositiveId(request.params.supplyId, "supplyId"),
      );
      response.status(204).send();
    }),
  );

  return router;
}

function parseCreatePlanRequest(body: unknown): CreatePlanRequest {
  const input = asRecord(body);
  const request = {
    title: requiredTitle(input.title),
    startAt: requiredDateTime(input.startAt, "startAt"),
    endAt: requiredDateTime(input.endAt, "endAt"),
    location: nullableString(input.location),
    memo: nullableString(input.memo),
    estimatedCost: nullableMoney(input.estimatedCost, "estimatedCost"),
  };

  assertValidDateRange(request.startAt, request.endAt);
  return request;
}

function parseUpdatePlanRequest(body: unknown): UpdatePlanRequest {
  const input = asRecord(body);
  const result: UpdatePlanRequest = {};

  if ("title" in input) {
    result.title = requiredTitle(input.title);
  }

  if ("startAt" in input) {
    result.startAt = requiredDateTime(input.startAt, "startAt");
  }

  if ("endAt" in input) {
    result.endAt = requiredDateTime(input.endAt, "endAt");
  }

  if ("location" in input) {
    result.location = nullableString(input.location);
  }

  if ("memo" in input) {
    result.memo = nullableString(input.memo);
  }

  if ("estimatedCost" in input) {
    result.estimatedCost = nullableMoney(input.estimatedCost, "estimatedCost");
  }

  if ("actualCost" in input) {
    result.actualCost = nullableMoney(input.actualCost, "actualCost");
  }

  if (result.startAt !== undefined && result.endAt !== undefined) {
    assertValidDateRange(result.startAt, result.endAt);
  }

  return result;
}

function parseUpdateSupplyRequest(body: unknown): { title?: string; isChecked?: boolean } {
  const input = asRecord(body);
  const result: { title?: string; isChecked?: boolean } = {};

  if ("title" in input) {
    result.title = requiredTitle(input.title);
  }

  if ("isChecked" in input) {
    if (typeof input.isChecked !== "boolean") {
      throwValidationError("isChecked must be a boolean.");
    }
    result.isChecked = input.isChecked;
  }

  return result;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throwValidationError("Request body must be an object.");
  }

  return value as Record<string, unknown>;
}

function requiredTitle(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throwValidationError("title must be a non-empty string.");
  }

  return value.trim();
}

function requiredDateTimeQuery(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throwValidationError(`${fieldName} query is required.`);
  }

  return requiredDateTime(value, fieldName);
}

function requiredDateTime(value: unknown, fieldName: string): string {
  const dateTime = nullableDateTime(value, fieldName);

  if (!dateTime) {
    throwValidationError(`${fieldName} is required.`);
  }

  return dateTime;
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

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throwValidationError("Expected string or null.");
  }

  return value.trim() === "" ? null : value;
}

function nullableMoney(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value)) {
    throwValidationError(`${fieldName} must be a decimal string.`);
  }

  return value;
}

function requiredPositiveId(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    throwValidationError(`${fieldName} must be a positive integer.`);
  }

  return value;
}

function assertValidDateRange(startAt: string | null, endAt: string | null): void {
  if (!startAt || !endAt) {
    return;
  }

  try {
    assertValidPlanTimeRange(startAt, endAt);
  } catch {
    throw new DomainError("PLAN_INVALID_TIME_RANGE", "Plan endAt must be after startAt.");
  }
}

function throwValidationError(message: string): never {
  throw new DomainError("VALIDATION_ERROR", message);
}
