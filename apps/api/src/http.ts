import type { NextFunction, Request, Response } from "express";
import { DomainError } from "@the-planner/shared";

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response, next).catch(next);
  };
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof DomainError) {
    response.status(statusForDomainError(error.code)).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Unexpected server error.",
    },
  });
}

function statusForDomainError(code: string): number {
  if (code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  if (code === "VALIDATION_ERROR") {
    return 400;
  }

  if (code === "TASK_MAX_DEPTH_EXCEEDED") {
    return 409;
  }

  return 400;
}
