import type { Dispatch, FormEvent, SetStateAction } from "react";
import { TASK_MAX_LEVEL, type TaskTreeNode, type TaskType } from "@the-planner/shared";
import type { PlanFormState, TaskFormState } from "./types";
import { taskTypeOptions } from "./task";

export function ComposePanel({
  flatTasks,
  taskForm,
  planForm,
  onTaskFormChange,
  onPlanFormChange,
  onCreateTask,
  onCreatePlan,
}: {
  flatTasks: TaskTreeNode[];
  taskForm: TaskFormState;
  planForm: PlanFormState;
  onTaskFormChange: Dispatch<SetStateAction<TaskFormState>>;
  onPlanFormChange: Dispatch<SetStateAction<PlanFormState>>;
  onCreateTask: (event: FormEvent<HTMLFormElement>) => void;
  onCreatePlan: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="panel compose-panel" id="compose" aria-labelledby="compose-heading">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Create</p>
          <h3 id="compose-heading">Task와 Plan 만들기</h3>
        </div>
      </div>

      <div className="forms-grid">
        <form onSubmit={onCreateTask}>
          <h4>Task</h4>
          <label>
            <span>상위 Task</span>
            <select
              value={taskForm.parentId}
              onChange={(event) => onTaskFormChange((current) => ({ ...current, parentId: event.target.value }))}
            >
              <option value="">최상위로 만들기</option>
              {flatTasks.map((task) => (
                <option key={task.id} value={task.id} disabled={task.level >= TASK_MAX_LEVEL}>
                  {"· ".repeat(Math.max(task.level - 1, 0))}
                  {task.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>종류</span>
            <select
              value={taskForm.type}
              onChange={(event) => onTaskFormChange((current) => ({ ...current, type: event.target.value as TaskType }))}
            >
              {taskTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>제목</span>
            <input
              value={taskForm.title}
              onChange={(event) => onTaskFormChange((current) => ({ ...current, title: event.target.value }))}
              placeholder="예: 제품 소개 페이지 작성"
            />
          </label>
          <label>
            <span>설명</span>
            <textarea
              value={taskForm.description}
              onChange={(event) => onTaskFormChange((current) => ({ ...current, description: event.target.value }))}
              rows={3}
            />
          </label>
          <label>
            <span>Why</span>
            <textarea
              value={taskForm.why}
              onChange={(event) => onTaskFormChange((current) => ({ ...current, why: event.target.value }))}
              rows={3}
            />
          </label>
          <button type="submit">Task 생성</button>
        </form>

        <form onSubmit={onCreatePlan}>
          <h4>Plan</h4>
          <label>
            <span>제목</span>
            <input
              value={planForm.title}
              onChange={(event) => onPlanFormChange((current) => ({ ...current, title: event.target.value }))}
              placeholder="예: 저녁 작업 블록"
            />
          </label>
          <label>
            <span>시작</span>
            <input
              type="datetime-local"
              value={planForm.startAt}
              onChange={(event) => onPlanFormChange((current) => ({ ...current, startAt: event.target.value }))}
            />
          </label>
          <label>
            <span>종료</span>
            <input
              type="datetime-local"
              value={planForm.endAt}
              onChange={(event) => onPlanFormChange((current) => ({ ...current, endAt: event.target.value }))}
            />
          </label>
          <label>
            <span>장소</span>
            <input
              value={planForm.location}
              onChange={(event) => onPlanFormChange((current) => ({ ...current, location: event.target.value }))}
            />
          </label>
          <label>
            <span>메모</span>
            <textarea
              value={planForm.memo}
              onChange={(event) => onPlanFormChange((current) => ({ ...current, memo: event.target.value }))}
              rows={3}
            />
          </label>
          <label>
            <span>예상 비용</span>
            <input
              inputMode="decimal"
              value={planForm.estimatedCost}
              onChange={(event) => onPlanFormChange((current) => ({ ...current, estimatedCost: event.target.value }))}
              placeholder="0.00"
            />
          </label>
          <button type="submit">Plan 생성</button>
        </form>
      </div>
    </section>
  );
}
