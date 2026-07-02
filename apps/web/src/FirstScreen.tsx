import { useMemo, useState } from "react";
import type { PlanSummary, PlanTaskSummary, TaskTreeNode } from "@the-planner/shared";
import { formatDateLabel, formatTimeRange } from "./date";
import type { PrimaryTab } from "./layout";
import { examplePlans, exampleTasks } from "./firstScreenExampleData";
import { GlobalTabNav } from "./GlobalTabNav";
import { PlanBuilderScreen } from "./PlanBuilderScreen";
import type { FirstScreenView, ScheduleSegment } from "./firstScreenTypes";

interface FocusItem {
  plan: PlanSummary;
  task: PlanTaskSummary;
}

const viewLabels: Record<FirstScreenView, string> = {
  designer: "TASK ARCHITECT",
  focus: "TODAY FOCUS",
  scheduler: "TIME HORIZON",
};

const scheduleLabels: Array<{ value: ScheduleSegment; label: string }> = [
  { value: "day", label: "일간" },
  { value: "week", label: "주간" },
  { value: "month", label: "월간" },
  { value: "year", label: "연간" },
];

function flattenNodes(nodes: TaskTreeNode[]): TaskTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);
}

function firstPlanMemo(plan: PlanSummary): string {
  return plan.memo || plan.location || formatTimeRange(plan);
}

export function FirstScreen({
  selectedDate,
  plans,
  tasks,
  onTogglePlanTask,
  onTabChange,
}: {
  selectedDate: string;
  plans: PlanSummary[];
  tasks: TaskTreeNode[];
  onTogglePlanTask: (planTask: PlanTaskSummary) => void;
  onTabChange: (tab: PrimaryTab) => void;
}) {
  const [view, setView] = useState<FirstScreenView>("focus");
  const [queueIndex, setQueueIndex] = useState(0);
  const [scheduleSegment, setScheduleSegment] = useState<ScheduleSegment>("day");

  const displayPlans = plans.length > 0 ? plans : examplePlans;
  const displayTasks = tasks.length > 0 ? tasks : exampleTasks;
  const focusQueue = useMemo<FocusItem[]>(
    () => displayPlans.flatMap((plan) => plan.tasks.filter((task) => task.status !== "done").map((task) => ({ plan, task }))),
    [displayPlans],
  );
  const completedCount = displayPlans.reduce((sum, plan) => sum + plan.tasks.filter((task) => task.status === "done").length, 0);
  const totalCount = displayPlans.reduce((sum, plan) => sum + plan.tasks.length, 0);
  const visibleQueueIndex = focusQueue.length === 0 ? 0 : Math.min(queueIndex, focusQueue.length - 1);
  const focusItem = focusQueue[visibleQueueIndex] ?? null;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  function completeFocusItem(): void {
    if (!focusItem) return;
    onTogglePlanTask(focusItem.task);
    setQueueIndex((current) => Math.min(current + 1, Math.max(focusQueue.length - 2, 0)));
  }

  function postponeFocusItem(): void {
    if (focusQueue.length < 2) return;
    setQueueIndex((current) => (current + 1) % focusQueue.length);
  }

  return (
    <section className="first-screen" aria-label="The Planner first screen">
      <div className="first-phone">
        <div className="first-phone-top">
          <div>
            <span>{viewLabels[view]}</span>
            <strong>{formatDateLabel(selectedDate)}</strong>
          </div>
          <i aria-hidden="true" />
        </div>

        <div className="first-phone-body">
          {view === "focus" ? (
            <div className="first-panel focus-panel">
              <div className="focus-progress">
                <span>오늘 남은 조각</span>
                <div><i style={{ width: `${progress}%` }} /></div>
              </div>

              <article className="focus-card">
                {focusItem ? (
                  <>
                    <span>{focusItem.plan.title}</span>
                    <h2>{focusItem.task.title}</h2>
                    <p>{firstPlanMemo(focusItem.plan)}</p>
                    <div className="focus-actions">
                      <button type="button" onClick={completeFocusItem}>완료 처리</button>
                      <button type="button" className="quiet-action" onClick={postponeFocusItem}>뒤로 미루기</button>
                      <button type="button" className="quiet-action teal" onClick={() => setView("designer")}>쪼개기</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span>오늘 집중</span>
                    <h2>비어 있음</h2>
                    <p>오늘 시간 블록에 실행 조각을 올려둘 수 있어요.</p>
                    <div className="focus-actions">
                      <button type="button" onClick={() => onTabChange("write")}>새로 적기</button>
                      <button type="button" className="quiet-action" onClick={() => onTabChange("planner")}>시간 보기</button>
                    </div>
                  </>
                )}
              </article>

              <p className="focus-queue-line">
                {focusQueue.length > 0 ? `${focusQueue.length}개 중 ${visibleQueueIndex + 1}번째 실행 중` : "대기 중인 실행 조각 없음"}
              </p>
            </div>
          ) : null}

          {view === "designer" ? <PlanBuilderScreen /> : null}

          {view === "scheduler" ? (
            <div className="first-panel scheduler-panel">
              <div className="schedule-segments">
                {scheduleLabels.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={scheduleSegment === item.value ? "active" : ""}
                    onClick={() => setScheduleSegment(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <SchedulePreview segment={scheduleSegment} plans={displayPlans} onOpenPlanner={() => onTabChange("planner")} />
            </div>
          ) : null}
        </div>

        <GlobalTabNav activeView={view} onViewChange={setView} />
      </div>
    </section>
  );
}

function SchedulePreview({
  segment,
  plans,
  onOpenPlanner,
}: {
  segment: ScheduleSegment;
  plans: PlanSummary[];
  onOpenPlanner: () => void;
}) {
  if (segment === "day") {
    return (
      <div className="schedule-stack">
        {(plans.length > 0 ? plans : []).slice(0, 4).map((plan) => (
          <button key={plan.id} type="button" className="schedule-block" onClick={onOpenPlanner}>
            <span>{formatTimeRange(plan)}</span>
            <strong>{plan.title}</strong>
            <em>{plan.tasks.length}개 조각</em>
          </button>
        ))}
        {plans.length === 0 ? (
          <button type="button" className="schedule-block empty" onClick={onOpenPlanner}>
            <span>오늘</span>
            <strong>비어 있음</strong>
            <em>계획 추가</em>
          </button>
        ) : null}
      </div>
    );
  }

  if (segment === "week") {
    return (
      <div className="week-preview">
        {["월", "화", "수", "목", "금", "토", "일"].map((day, index) => (
          <button key={day} type="button" className={index === 3 ? "active" : ""} onClick={onOpenPlanner}>
            <span>{day}</span>
            <strong>{index === 3 ? plans.length : 0}</strong>
          </button>
        ))}
      </div>
    );
  }

  if (segment === "month") {
    return (
      <div className="month-preview">
        {Array.from({ length: 31 }, (_, index) => (
          <button key={index} type="button" className={index === 1 ? "active" : ""} onClick={onOpenPlanner}>
            {index + 1}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="year-preview">
      {["1분기", "2분기", "3분기", "4분기"].map((quarter, index) => (
        <button key={quarter} type="button" className={index === 2 ? "active" : ""} onClick={onOpenPlanner}>
          <span>{quarter}</span>
          <strong>{index === 2 ? "진행 중" : "대기"}</strong>
        </button>
      ))}
    </div>
  );
}
