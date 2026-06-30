import type { Dispatch, FormEvent, SetStateAction } from "react";
import { TASK_MAX_LEVEL, type TaskId, type TaskTreeNode, type TaskType } from "@the-planner/shared";
import type { TaskEditFormState } from "./types";

export const taskTypeLabels: Record<TaskType, string> = {
  aspiration: "지향점",
  project: "프로젝트",
  task: "할 일",
};

export const taskTypeOptions: Array<{ value: TaskType; label: string }> = [
  { value: "aspiration", label: taskTypeLabels.aspiration },
  { value: "project", label: taskTypeLabels.project },
  { value: "task", label: taskTypeLabels.task },
];

export function flattenTasks(nodes: TaskTreeNode[]): TaskTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTasks(node.children)]);
}

export function TaskTree({
  nodes,
  selectedTaskId,
  onSelectTask,
}: {
  nodes: TaskTreeNode[];
  selectedTaskId: TaskId | "";
  onSelectTask: (taskId: TaskId) => void;
}) {
  if (nodes.length === 0) {
    return <p className="empty-copy">아직 Task가 없습니다.</p>;
  }

  return (
    <ul className="task-tree">
      {nodes.map((node) => (
        <li key={node.id}>
          <button
            type="button"
            className={node.id === selectedTaskId ? "task-node selected" : "task-node"}
            onClick={() => onSelectTask(node.id)}
          >
            <span className={`type-dot ${node.type}`} />
            <span className="task-title">{node.title}</span>
            <span className="task-meta">
              {taskTypeLabels[node.type]} · L{node.level} · {node.progress.leafDoneCount}/{node.progress.leafTotalCount}
            </span>
          </button>
          {node.children.length > 0 ? (
            <TaskTree nodes={node.children} selectedTaskId={selectedTaskId} onSelectTask={onSelectTask} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function TaskPanel({
  tasks,
  flatTasks,
  selectedTaskId,
  onSelectTask,
}: {
  tasks: TaskTreeNode[];
  flatTasks: TaskTreeNode[];
  selectedTaskId: TaskId | "";
  onSelectTask: (taskId: TaskId) => void;
}) {
  return (
    <section className="panel task-panel" id="tasks" aria-labelledby="tasks-heading">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Task Tree</p>
          <h3 id="tasks-heading">방향과 실행 단위</h3>
        </div>
        <span className="metric">{flatTasks.length}개 · 최대 {TASK_MAX_LEVEL}단계</span>
      </div>

      <TaskTree nodes={tasks} selectedTaskId={selectedTaskId} onSelectTask={onSelectTask} />
    </section>
  );
}

export function TaskDetailPanel({
  selectedTask,
  editForm,
  onEditFormChange,
  onUpdateTask,
  onToggleTaskDone,
  onDeleteTask,
}: {
  selectedTask: TaskTreeNode | null;
  editForm: TaskEditFormState;
  onEditFormChange: Dispatch<SetStateAction<TaskEditFormState>>;
  onUpdateTask: (event: FormEvent<HTMLFormElement>) => void;
  onToggleTaskDone: () => void;
  onDeleteTask: () => void;
}) {
  return (
    <section className="panel detail-panel" aria-labelledby="detail-heading">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Task Detail</p>
          <h3 id="detail-heading">{selectedTask?.title ?? "Task를 선택하세요"}</h3>
        </div>
        {selectedTask ? <span className={`status-label ${selectedTask.status}`}>{selectedTask.status}</span> : null}
      </div>

      {selectedTask ? (
        <form className="detail-stack" onSubmit={onUpdateTask}>
          <dl>
            <div>
              <dt>종류</dt>
              <dd>{taskTypeLabels[selectedTask.type]}</dd>
            </div>
            <div>
              <dt>단계</dt>
              <dd>{selectedTask.level}</dd>
            </div>
            <div>
              <dt>진행률</dt>
              <dd>
                {selectedTask.progress.leafDoneCount} / {selectedTask.progress.leafTotalCount}
              </dd>
            </div>
          </dl>

          <div className="edit-grid">
            <label>
              <span>종류</span>
              <select
                value={editForm.type}
                onChange={(event) => onEditFormChange((current) => ({ ...current, type: event.target.value as TaskType }))}
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
                value={editForm.title}
                onChange={(event) => onEditFormChange((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
          </div>

          <label>
            <span>설명</span>
            <textarea
              value={editForm.description}
              onChange={(event) => onEditFormChange((current) => ({ ...current, description: event.target.value }))}
              rows={3}
            />
          </label>

          <label>
            <span>Why</span>
            <textarea
              value={editForm.why}
              onChange={(event) => onEditFormChange((current) => ({ ...current, why: event.target.value }))}
              rows={3}
            />
          </label>

          <div className="button-row">
            <button type="submit">수정 저장</button>
            <button type="button" className="secondary-button" onClick={onToggleTaskDone}>
              {selectedTask.status === "done" ? "완료 해제" : "완료"}
            </button>
            <button type="button" className="danger-button" onClick={onDeleteTask}>
              삭제
            </button>
          </div>
        </form>
      ) : (
        <p className="empty-copy">왼쪽에서 Task를 선택하면 상세가 표시됩니다.</p>
      )}
    </section>
  );
}
