import type { TaskId, TaskType } from "@the-planner/shared";

export type ApiState = "idle" | "loading" | "error";

export interface TaskFormState {
  parentId: TaskId | "";
  type: TaskType;
  title: string;
  description: string;
  why: string;
}

export interface TaskEditFormState {
  type: TaskType;
  title: string;
  description: string;
  why: string;
}

export interface PlanFormState {
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  memo: string;
  estimatedCost: string;
}

export interface SupplyFormState {
  title: string;
}
