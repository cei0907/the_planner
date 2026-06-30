import type {
  IsoDateTime,
  MoneyDecimal,
  Plan,
  PlanTaskStatus,
  Task,
  TaskId,
  TaskProgress,
  TaskStatus,
  TaskType,
} from "./domain";

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

export interface TaskSummary
  extends Pick<
    Task,
    | "id"
    | "parentId"
    | "type"
    | "title"
    | "description"
    | "why"
    | "level"
    | "status"
    | "targetStartAt"
    | "targetEndAt"
  > {
  progress: Pick<TaskProgress, "leafTotalCount" | "leafDoneCount" | "progressRate">;
}

export interface TaskTreeNode extends TaskSummary {
  children: TaskTreeNode[];
}

export interface CreateTaskRequest {
  type: TaskType;
  title: string;
  description: string | null;
  why: string | null;
  targetStartAt: IsoDateTime | null;
  targetEndAt: IsoDateTime | null;
}

export interface UpdateTaskRequest {
  type?: TaskType;
  title?: string;
  description?: string | null;
  why?: string | null;
  status?: TaskStatus;
  targetStartAt?: IsoDateTime | null;
  targetEndAt?: IsoDateTime | null;
}

export interface PlanSummary
  extends Pick<
    Plan,
    | "id"
    | "title"
    | "startAt"
    | "endAt"
    | "location"
    | "memo"
    | "estimatedCost"
    | "actualCost"
  > {
  tasks: PlanTaskSummary[];
  supplies: PlanSupplySummary[];
}

export interface CreatePlanRequest {
  title: string;
  startAt: IsoDateTime;
  endAt: IsoDateTime;
  location: string | null;
  memo: string | null;
  estimatedCost: MoneyDecimal | null;
}

export interface UpdatePlanRequest {
  title?: string;
  startAt?: IsoDateTime;
  endAt?: IsoDateTime;
  location?: string | null;
  memo?: string | null;
  estimatedCost?: MoneyDecimal | null;
  actualCost?: MoneyDecimal | null;
}

export interface PlanTaskSummary {
  planTaskId: string;
  taskId: TaskId;
  title: string;
  status: PlanTaskStatus;
  completedAt: IsoDateTime | null;
}

export interface PlanSupplySummary {
  id: string;
  title: string;
  isChecked: boolean;
}

export interface TaskCandidate {
  id: TaskId;
  title: string;
  type: TaskType;
  level: number;
  isLeaf: boolean;
  leafCount: number;
  targetStartAt: IsoDateTime | null;
  targetEndAt: IsoDateTime | null;
}

export interface ListResponse<T> {
  items: T[];
}
