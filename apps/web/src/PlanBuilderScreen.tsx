import { useMemo, useState } from "react";
import type { PlannerTreeItem } from "./firstScreenTypes";

const initialPlannerTree: PlannerTreeItem[] = [
  { id: "0", parentId: null, title: "노래 만들기", level: 1, type: "aspiration", collapsed: false },
  { id: "00", parentId: "0", title: "비트 만들기", level: 2, type: "project", collapsed: false },
  { id: "000", parentId: "00", title: "스플라이스 사운드 추출", level: 3, type: "task", collapsed: false },
  { id: "001", parentId: "00", title: "리듬 배치하기", level: 3, type: "task", collapsed: false },
  { id: "01", parentId: "0", title: "코드진행 만들기", level: 2, type: "project", collapsed: false },
  { id: "010", parentId: "01", title: "곡의 키 정하기", level: 3, type: "task", collapsed: false },
  { id: "011", parentId: "01", title: "반복할 코드 수 정하기", level: 3, type: "task", collapsed: false },
  { id: "012", parentId: "01", title: "코드 보이싱하기", level: 3, type: "task", collapsed: false },
];

function createChildId(parentId: string, items: PlannerTreeItem[]): string {
  let suffix = 0;
  let nextId = `${parentId}${suffix}`;
  while (items.some((item) => item.id === nextId)) {
    suffix += 1;
    nextId = `${parentId}${suffix}`;
  }
  return nextId;
}

function nodeMeta(node: PlannerTreeItem): { badge: string; className: string; borderClass: string } {
  if (node.level === 1) {
    return {
      badge: "Lv1 Dream",
      className: "planner-tree-badge dream",
      borderClass: "dream",
    };
  }

  if (node.level === 2) {
    return {
      badge: "Lv2 Project",
      className: "planner-tree-badge project",
      borderClass: "project",
    };
  }

  return {
    badge: `Lv${node.level} Task`,
    className: "planner-tree-badge task",
    borderClass: "task",
  };
}

export function PlanBuilderScreen() {
  const [items, setItems] = useState<PlannerTreeItem[]>(initialPlannerTree);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = items.find((item) => item.id === selectedTaskId) ?? null;
  const roots = useMemo(() => items.filter((item) => item.parentId === null), [items]);

  function toggleNode(nodeId: string): void {
    setItems((current) => current.map((item) => item.id === nodeId ? { ...item, collapsed: !item.collapsed } : item));
  }

  function addRootTask(): void {
    const title = window.prompt("새로운 최상위 꿈(Aspiration) 이름을 입력하세요:");
    if (!title?.trim()) return;

    setItems((current) => [
      ...current,
      {
        id: String(Math.max(0, ...current.map((item) => Number.parseInt(item.id, 10)).filter(Number.isFinite)) + 1),
        parentId: null,
        title: title.trim(),
        level: 1,
        type: "aspiration",
        collapsed: false,
      },
    ]);
  }

  function addSubtask(): void {
    if (!selectedTask || selectedTask.level >= 5) return;

    const title = window.prompt(`[${selectedTask.title}] 아래에 생성할 하위 Task 이름을 입력하세요:`);
    if (!title?.trim()) return;

    setItems((current) => [
      ...current,
      {
        id: createChildId(selectedTask.id, current),
        parentId: selectedTask.id,
        title: title.trim(),
        level: selectedTask.level + 1,
        type: "task",
        collapsed: false,
      },
    ]);
    setSelectedTaskId(null);
  }

  function editTaskName(): void {
    if (!selectedTask) return;

    const title = window.prompt("Task 이름을 수정합니다:", selectedTask.title);
    if (!title?.trim()) return;

    setItems((current) => current.map((item) => item.id === selectedTask.id ? { ...item, title: title.trim() } : item));
    setSelectedTaskId(null);
  }

  return (
    <div className="first-panel designer-panel">
      <div className="planner-builder-head">
        <span>의미 구조 설계 (터치하여 제어)</span>
        <strong>Foldable Tree</strong>
      </div>

      <div className="planner-tree-scroll" aria-label="Task tree">
        {roots.map((node) => (
          <PlannerTreeNode
            key={node.id}
            node={node}
            items={items}
            onSelect={setSelectedTaskId}
            onToggle={toggleNode}
          />
        ))}
      </div>

      <button type="button" className="planner-add-root" onClick={addRootTask}>
        <span>➕ 새로운 최상위 꿈 추가하기</span>
      </button>

      <TaskActionSheet
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onAddSubtask={addSubtask}
        onEditTask={editTaskName}
      />
    </div>
  );
}

function PlannerTreeNode({
  node,
  items,
  onSelect,
  onToggle,
}: {
  node: PlannerTreeItem;
  items: PlannerTreeItem[];
  onSelect: (taskId: string) => void;
  onToggle: (taskId: string) => void;
}) {
  const children = items.filter((item) => item.parentId === node.id);
  const hasChildren = children.length > 0;
  const meta = nodeMeta(node);

  return (
    <div className="planner-tree-node-wrap">
      <button
        type="button"
        className={`glass-tree-node planner-tree-node ${meta.borderClass}`}
        onClick={() => onSelect(node.id)}
      >
        <span className="planner-tree-node-header">
          <span className="planner-tree-node-left">
            {hasChildren ? (
              <span
                className="toggle-arrow"
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(node.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggle(node.id);
                  }
                }}
              >
                {node.collapsed ? "▶" : "▼"}
              </span>
            ) : null}
            <span className={meta.className}>{meta.badge}</span>
          </span>
          <span className="planner-tree-id">id:{node.id}</span>
        </span>
        <strong className={node.level === 1 ? "root-title" : ""}>{node.title}</strong>
      </button>

      {hasChildren && !node.collapsed ? (
        <div className="tree-line-branch planner-tree-branch">
          {children.map((child) => (
            <PlannerTreeNode
              key={child.id}
              node={child}
              items={items}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TaskActionSheet({
  task,
  onClose,
  onAddSubtask,
  onEditTask,
}: {
  task: PlannerTreeItem | null;
  onClose: () => void;
  onAddSubtask: () => void;
  onEditTask: () => void;
}) {
  const isOpen = task !== null;

  return (
    <div className={isOpen ? "bottom-sheet planner-action-sheet open" : "bottom-sheet planner-action-sheet"} aria-hidden={!isOpen}>
      <div className="planner-sheet-handle" />
      <div>
        <span className="planner-sheet-meta">{task ? `Lv${task.level} ${task.type.toUpperCase()}` : "Lv2 Project"}</span>
        <h3>{task?.title ?? "비트 만들기"}</h3>
      </div>

      <div className="planner-sheet-actions">
        <button type="button" className="primary" onClick={onAddSubtask} disabled={!task || task.level >= 5}>
          <span>➕ 하부 구조 추가하기</span>
        </button>
        <button type="button" className="secondary" onClick={onEditTask} disabled={!task}>
          <span>✏️ 이 Task 이름 편집하기</span>
        </button>
        <button type="button" className="cancel" onClick={onClose}>
          취소
        </button>
      </div>
    </div>
  );
}
