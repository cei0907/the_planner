import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import {
  TASK_MAX_LEVEL,
  type CreatePlanRequest,
  type CreateTaskRequest,
  type ListResponse,
  type PlanSummary,
  type PlanSupplySummary,
  type PlanTaskSummary,
  type TaskCandidate,
  type TaskId,
  type TaskTreeNode,
  type TaskType,
} from "@the-planner/shared";
import { requestJson } from "./api";
import {
  dayRange,
  formatDateLabel,
  formatTimeRange,
  getTodayInputDate,
  monthRange,
  toDateTimeInput,
  toInputDate,
  toIsoDateTime,
  weekRange,
  yearRange,
} from "./date";
import { AppLayout, type PrimaryTab } from "./layout";
import type { ApiState, PlanFormState, SupplyFormState, TaskFormState } from "./types";

type PlannerView = "month" | "week" | "day";
type TaskListView = "year" | "month" | "week" | "day";

const taskTypeLabels: Record<TaskType, string> = {
  aspiration: "지향점",
  project: "프로젝트",
  task: "할 일",
};

const taskTypeOptions: Array<{ value: TaskType; label: string }> = [
  { value: "aspiration", label: "지향점" },
  { value: "project", label: "프로젝트" },
  { value: "task", label: "할 일" },
];

function createDefaultPlanForm(): PlanFormState {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return createPlanFormFromDates(start, end);
}

function createPlanFormFromDates(start: Date, end: Date): PlanFormState {
  return {
    title: "",
    startAt: toDateTimeInput(start),
    endAt: toDateTimeInput(end),
    location: "",
    memo: "",
    estimatedCost: "",
  };
}

function createPlanFormFromGridPointer(dateInput: string, event: MouseEvent<HTMLElement>): PlanFormState {
  const rect = event.currentTarget.getBoundingClientRect();
  const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
  const rawMinutes = (y / rect.height) * 24 * 60;
  const startMinutes = Math.min(Math.max(Math.round(rawMinutes / 30) * 30, 0), 23 * 60 + 30);
  const start = new Date(`${dateInput}T00:00:00`);
  start.setMinutes(startMinutes, 0, 0);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return createPlanFormFromDates(start, end);
}

function flattenTasks(nodes: TaskTreeNode[]): TaskTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTasks(node.children)]);
}

function dateKey(date: Date): string {
  return toInputDate(date);
}

function planStartsOn(plan: PlanSummary, inputDate: string): boolean {
  return dateKey(new Date(plan.startAt)) === inputDate;
}

function rangeForTaskList(view: TaskListView, selectedDate: string): { from: string; to: string } {
  if (view === "year") return yearRange(selectedDate);
  if (view === "month") return monthRange(selectedDate);
  if (view === "week") return weekRange(selectedDate);
  return dayRange(selectedDate);
}

function taskOverlapsRange(task: TaskTreeNode, range: { from: string; to: string }): boolean {
  if (!task.targetStartAt || !task.targetEndAt) {
    return true;
  }

  return new Date(task.targetStartAt).getTime() < new Date(range.to).getTime()
    && new Date(task.targetEndAt).getTime() > new Date(range.from).getTime();
}

function ViewTabs<T extends string>({
  value,
  items,
  onChange,
}: {
  value: T;
  items: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="view-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={item.value === value ? "view-tab active" : "view-tab"}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function MonthCalendar({
  selectedDate,
  plans,
  onSelectDate,
}: {
  selectedDate: string;
  plans: PlanSummary[];
  onSelectDate: (date: string) => void;
}) {
  const anchor = new Date(`${selectedDate}T00:00:00`);
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
  const monthLabel = anchor.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });

  return (
    <section className="planner-page">
      <div className="section-heading">
        <p className="eyebrow">Monthly Planner</p>
        <h2>{monthLabel}</h2>
        <p>한 달의 약속과 실행 블록을 한 페이지에서 바라봅니다.</p>
      </div>

      <div className="month-weekdays" aria-hidden="true">
        {["일", "월", "화", "수", "목", "금", "토"].map((label) => <span key={label}>{label}</span>)}
      </div>

      <div className="month-grid">
        {days.map((day) => {
          const inputDate = dateKey(day);
          const dayPlans = plans.filter((plan) => planStartsOn(plan, inputDate));
          const isSelected = inputDate === selectedDate;
          const isCurrentMonth = day.getMonth() === anchor.getMonth();

          return (
            <button
              key={inputDate}
              type="button"
              className={["month-day", isSelected ? "selected" : "", isCurrentMonth ? "" : "muted"].filter(Boolean).join(" ")}
              onClick={() => onSelectDate(inputDate)}
            >
              <span>{day.getDate()}</span>
              <strong>{dayPlans.length > 0 ? dayPlans.length : ""}</strong>
              <small>{dayPlans[0]?.title ?? ""}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function WeekPlanner({ selectedDate, plans, onSelectDate, onTimeSlotSelect }: { selectedDate: string; plans: PlanSummary[]; onSelectDate: (date: string) => void; onTimeSlotSelect: (dateInput: string, event: MouseEvent<HTMLElement>) => void }) {
  const range = weekRange(selectedDate);
  const start = new Date(range.from);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  return (
    <section className="planner-page">
      <div className="section-heading">
        <p className="eyebrow">Weekly Planner</p>
        <h2>이번 주 시간표</h2>
        <p>가로축은 요일, 세로축은 24시간입니다. 이번 주의 흐름을 시간 위에서 봅니다.</p>
      </div>

      <div className="week-board">
        <div className="week-corner" />
        {days.map((day) => {
          const inputDate = dateKey(day);
          return (
            <button key={inputDate} type="button" className={inputDate === selectedDate ? "week-day-head selected" : "week-day-head"} onClick={() => onSelectDate(inputDate)}>
              <span>{day.toLocaleDateString("ko-KR", { weekday: "short" })}</span>
              <strong>{day.getDate()}</strong>
            </button>
          );
        })}
        <div className="week-hours">
          {hours.map((hour) => <span key={hour}>{String(hour).padStart(2, "0")}:00</span>)}
        </div>
        {days.map((day) => {
          const inputDate = dateKey(day);
          const dayPlans = plans.filter((plan) => planStartsOn(plan, inputDate));
          return (
            <div
              key={inputDate}
              className="week-column time-grid"
              onClick={(event) => onTimeSlotSelect(inputDate, event)}
              role="button"
              tabIndex={0}
              aria-label={`${inputDate} 시간 선택`}
            >
              {hours.map((hour) => <div key={hour} className="hour-line" />)}
              {dayPlans.map((plan) => <PlanTimeBlock key={plan.id} plan={plan} />)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DayPlanner({ selectedDate, plans, onTogglePlanTask, onTimeSlotSelect }: { selectedDate: string; plans: PlanSummary[]; onTogglePlanTask: (planTask: PlanTaskSummary) => void; onTimeSlotSelect: (dateInput: string, event: MouseEvent<HTMLElement>) => void }) {
  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  return (
    <section className="planner-page day-page">
      <div className="section-heading">
        <p className="eyebrow">Daily Planner</p>
        <h2>오늘의 24시간</h2>
        <p>시간 블록 안에 오늘의 실행과 준비물을 차분히 올려둡니다.</p>
      </div>

      <div className="day-board">
        <div className="day-hours">
          {hours.map((hour) => <span key={hour}>{String(hour).padStart(2, "0")}:00</span>)}
        </div>
        <div
          className="day-column time-grid"
          onClick={(event) => onTimeSlotSelect(selectedDate, event)}
          role="button"
          tabIndex={0}
          aria-label={`${selectedDate} 시간 선택`}
        >
          {hours.map((hour) => <div key={hour} className="hour-line" />)}
          {plans.map((plan) => (
            <article key={plan.id} className="day-plan-card" onClick={(event) => event.stopPropagation()}>
              <div>
                <span>{formatTimeRange(plan)}</span>
                <h3>{plan.title}</h3>
                <p>{plan.location || "장소 미정"}</p>
              </div>
              <ul className="mini-check-list">
                {plan.tasks.map((task) => (
                  <li key={task.planTaskId}>
                    <label>
                      <input type="checkbox" checked={task.status === "done"} onChange={() => onTogglePlanTask(task)} />
                      <span>{task.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanTimeBlock({ plan }: { plan: PlanSummary }) {
  const start = new Date(plan.startAt);
  const end = new Date(plan.endAt);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const durationMinutes = Math.max(30, (end.getTime() - start.getTime()) / 60000);

  return (
    <div
      className="time-plan"
      onClick={(event) => event.stopPropagation()}
      style={{
        top: `${(startMinutes / 1440) * 100}%`,
        height: `${Math.min(100, (durationMinutes / 1440) * 100)}%`,
      }}
    >
      <strong>{plan.title}</strong>
      <span>{formatTimeRange(plan)}</span>
    </div>
  );
}

function TodayPage({
  selectedDate,
  plans,
  onTogglePlanTask,
  onTimeSlotSelect,
}: {
  selectedDate: string;
  plans: PlanSummary[];
  onTogglePlanTask: (planTask: PlanTaskSummary) => void;
  onTimeSlotSelect: (dateInput: string, event: MouseEvent<HTMLElement>) => void;
}) {
  const taskCount = plans.reduce((sum, plan) => sum + plan.tasks.length, 0);
  const doneCount = plans.reduce((sum, plan) => sum + plan.tasks.filter((task) => task.status === "done").length, 0);

  return (
    <div className="screen-stack">
      <section className="today-hero">
        <p className="eyebrow">Today</p>
        <h2>{formatDateLabel(selectedDate)}</h2>
        <p>오늘은 어떤 하루로 만들고 싶나요?</p>
        <div className="hero-metrics">
          <span>{plans.length}개의 시간 블록</span>
          <span>{doneCount}/{taskCount} 해냄</span>
        </div>
      </section>
      <DayPlanner selectedDate={selectedDate} plans={plans} onTogglePlanTask={onTogglePlanTask} onTimeSlotSelect={onTimeSlotSelect} />
    </div>
  );
}

function TaskListPage({ view, selectedDate, tasks, onViewChange }: { view: TaskListView; selectedDate: string; tasks: TaskTreeNode[]; onViewChange: (view: TaskListView) => void }) {
  const range = rangeForTaskList(view, selectedDate);
  const items = tasks.filter((task) => taskOverlapsRange(task, range));

  return (
    <section className="planner-page">
      <div className="section-heading">
        <p className="eyebrow">Task List</p>
        <h2>기간별 할 일 목록</h2>
        <p>시간표가 아니라, 이 기간에 신경 써야 할 목표와 실행 항목을 리스트로 봅니다.</p>
      </div>
      <ViewTabs
        value={view}
        onChange={onViewChange}
        items={[
          { value: "year", label: "연간" },
          { value: "month", label: "월간" },
          { value: "week", label: "주간" },
          { value: "day", label: "일간" },
        ]}
      />
      <ul className="task-list-cards">
        {items.map((task) => (
          <li key={task.id}>
            <span className={`type-chip ${task.type}`}>{taskTypeLabels[task.type]}</span>
            <div>
              <h3>{task.title}</h3>
              <p>{task.why || task.description || "아직 이유나 설명이 비어 있어요."}</p>
            </div>
            <strong>{task.progress.leafDoneCount}/{task.progress.leafTotalCount}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LifeMapPage({ tasks }: { tasks: TaskTreeNode[] }) {
  return (
    <section className="planner-page">
      <div className="section-heading">
        <p className="eyebrow">Life Map</p>
        <h2>삶의 지도</h2>
        <p>지향점, 프로젝트, 할 일이 어떤 흐름으로 이어지는지 봅니다.</p>
      </div>
      <TaskTree nodes={tasks} />
    </section>
  );
}

function TaskTree({ nodes }: { nodes: TaskTreeNode[] }) {
  if (nodes.length === 0) {
    return <p className="empty-copy">아직 적어둔 목표가 없어요. 쓰기 탭에서 첫 문장을 시작해보세요.</p>;
  }

  return (
    <ul className="life-tree">
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="life-node">
            <span className={`type-chip ${node.type}`}>{taskTypeLabels[node.type]}</span>
            <div>
              <h3>{node.title}</h3>
              <p>{node.why || node.description || "이 항목이 왜 중요한지 적어두면 더 오래 남아요."}</p>
            </div>
            <strong>{node.progress.leafDoneCount}/{node.progress.leafTotalCount}</strong>
          </div>
          {node.children.length > 0 ? <TaskTree nodes={node.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

function WritePage({
  flatTasks,
  candidates,
  selectedCandidateId,
  taskForm,
  planForm,
  supplyForm,
  selectedPlan,
  onTaskFormChange,
  onPlanFormChange,
  onSupplyFormChange,
  onCreateTask,
  onCreatePlan,
  onSelectCandidate,
  onAddCandidate,
  onAddSupply,
  onToggleSupply,
}: {
  flatTasks: TaskTreeNode[];
  candidates: TaskCandidate[];
  selectedCandidateId: TaskId | "";
  taskForm: TaskFormState;
  planForm: PlanFormState;
  supplyForm: SupplyFormState;
  selectedPlan: PlanSummary | null;
  onTaskFormChange: (state: TaskFormState) => void;
  onPlanFormChange: (state: PlanFormState) => void;
  onSupplyFormChange: (state: SupplyFormState) => void;
  onCreateTask: (event: FormEvent<HTMLFormElement>) => void;
  onCreatePlan: (event: FormEvent<HTMLFormElement>) => void;
  onSelectCandidate: (taskId: TaskId | "") => void;
  onAddCandidate: () => void;
  onAddSupply: (event: FormEvent<HTMLFormElement>) => void;
  onToggleSupply: (supply: PlanSupplySummary) => void;
}) {
  return (
    <section className="planner-page write-page">
      <div className="section-heading">
        <p className="eyebrow">Write</p>
        <h2>새 목표와 시간을 적기</h2>
        <p>먼저 마음에 걸리는 것을 적고, 가능하면 시간 위에 살짝 올려둡니다.</p>
      </div>

      <div className="write-grid">
        <form className="paper-form" onSubmit={onCreateTask}>
          <h3>무엇을 이루고 싶나요?</h3>
          <label>
            <span>상위 항목</span>
            <select value={taskForm.parentId} onChange={(event) => onTaskFormChange({ ...taskForm, parentId: event.target.value })}>
              <option value="">새로운 큰 줄기로 적기</option>
              {flatTasks.map((task) => (
                <option key={task.id} value={task.id} disabled={task.level >= TASK_MAX_LEVEL}>
                  {"- ".repeat(Math.max(task.level - 1, 0))}{task.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>종류</span>
            <select value={taskForm.type} onChange={(event) => onTaskFormChange({ ...taskForm, type: event.target.value as TaskType })}>
              {taskTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>제목</span>
            <input value={taskForm.title} onChange={(event) => onTaskFormChange({ ...taskForm, title: event.target.value })} placeholder="예: 건강한 아침 루틴 만들기" />
          </label>
          <label>
            <span>왜 중요한가요?</span>
            <textarea value={taskForm.why} onChange={(event) => onTaskFormChange({ ...taskForm, why: event.target.value })} rows={3} />
          </label>
          <label>
            <span>조금 더 적어두기</span>
            <textarea value={taskForm.description} onChange={(event) => onTaskFormChange({ ...taskForm, description: event.target.value })} rows={3} />
          </label>
          <button type="submit">새 목표 적기</button>
        </form>

        <form className="paper-form" onSubmit={onCreatePlan}>
          <h3>언제 해볼까요?</h3>
          <p className="draft-hint">시간표를 터치하면 시작/종료 시간이 자동으로 채워집니다.</p>
          <label>
            <span>시간 블록 이름</span>
            <input value={planForm.title} onChange={(event) => onPlanFormChange({ ...planForm, title: event.target.value })} placeholder="예: 아침 정리 시간" />
          </label>
          <label>
            <span>시작</span>
            <input type="datetime-local" value={planForm.startAt} onChange={(event) => onPlanFormChange({ ...planForm, startAt: event.target.value })} />
          </label>
          <label>
            <span>종료</span>
            <input type="datetime-local" value={planForm.endAt} onChange={(event) => onPlanFormChange({ ...planForm, endAt: event.target.value })} />
          </label>
          <label>
            <span>장소</span>
            <input value={planForm.location} onChange={(event) => onPlanFormChange({ ...planForm, location: event.target.value })} />
          </label>
          <label>
            <span>메모</span>
            <textarea value={planForm.memo} onChange={(event) => onPlanFormChange({ ...planForm, memo: event.target.value })} rows={3} />
          </label>
          <label>
            <span>예상 비용</span>
            <input inputMode="decimal" value={planForm.estimatedCost} onChange={(event) => onPlanFormChange({ ...planForm, estimatedCost: event.target.value })} placeholder="0.00" />
          </label>
          <button type="submit">시간에 올리기</button>
        </form>
      </div>

      {selectedPlan ? (
        <div className="paper-form attach-panel">
          <h3>{selectedPlan.title}에 연결하기</h3>
          <div className="inline-controls">
            <select value={selectedCandidateId} onChange={(event) => onSelectCandidate(event.target.value)} disabled={candidates.length === 0}>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.title}{candidate.isLeaf ? "" : ` (${candidate.leafCount}개 leaf)`}</option>
              ))}
            </select>
            <button type="button" onClick={onAddCandidate} disabled={!selectedCandidateId}>연결</button>
          </div>
          <form className="inline-controls" onSubmit={onAddSupply}>
            <input value={supplyForm.title} onChange={(event) => onSupplyFormChange({ title: event.target.value })} placeholder="준비물" />
            <button type="submit">추가</button>
          </form>
          <ul className="supply-list">
            {selectedPlan.supplies.map((supply) => (
              <li key={supply.id}>
                <label>
                  <input type="checkbox" checked={supply.isChecked} onChange={() => onToggleSupply(supply)} />
                  <span>{supply.title}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function App() {
  const [status, setStatus] = useState<ApiState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PrimaryTab>("today");
  const [plannerView, setPlannerView] = useState<PlannerView>("day");
  const [taskListView, setTaskListView] = useState<TaskListView>("month");
  const [tasks, setTasks] = useState<TaskTreeNode[]>([]);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [monthPlans, setMonthPlans] = useState<PlanSummary[]>([]);
  const [weekPlans, setWeekPlans] = useState<PlanSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayInputDate);
  const [selectedPlanId, setSelectedPlanId] = useState<string | "">("");
  const [candidates, setCandidates] = useState<TaskCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<TaskId | "">("");
  const [taskForm, setTaskForm] = useState<TaskFormState>({ parentId: "", type: "task", title: "", description: "", why: "" });
  const [planForm, setPlanForm] = useState<PlanFormState>(createDefaultPlanForm);
  const [supplyForm, setSupplyForm] = useState<SupplyFormState>({ title: "" });

  const flatTasks = useMemo(() => flattenTasks(tasks), [tasks]);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;

  async function loadWorkspace(dateInput = selectedDate): Promise<void> {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const day = dayRange(dateInput);
      const month = monthRange(dateInput);
      const week = weekRange(dateInput);
      const [taskTree, dayPlanList, monthPlanList, weekPlanList] = await Promise.all([
        requestJson<ListResponse<TaskTreeNode>>("/tasks/tree"),
        requestJson<ListResponse<PlanSummary>>(`/plans?from=${encodeURIComponent(day.from)}&to=${encodeURIComponent(day.to)}`),
        requestJson<ListResponse<PlanSummary>>(`/plans?from=${encodeURIComponent(month.from)}&to=${encodeURIComponent(month.to)}`),
        requestJson<ListResponse<PlanSummary>>(`/plans?from=${encodeURIComponent(week.from)}&to=${encodeURIComponent(week.to)}`),
      ]);

      setTasks(taskTree.items);
      setPlans(dayPlanList.items);
      setMonthPlans(monthPlanList.items);
      setWeekPlans(weekPlanList.items);
      setSelectedPlanId((current) => {
        if (current && dayPlanList.items.some((plan) => plan.id === current)) return current;
        return dayPlanList.items[0]?.id ?? "";
      });
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "데이터를 불러오지 못했어요.");
    }
  }

  useEffect(() => {
    void loadWorkspace(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedPlan?.id) {
      setCandidates([]);
      setSelectedCandidateId("");
      return;
    }

    requestJson<ListResponse<TaskCandidate>>(`/plans/${selectedPlan.id}/task-candidates?includeNoTarget=true`)
      .then((response) => {
        setCandidates(response.items);
        setSelectedCandidateId(response.items[0]?.id ?? "");
      })
      .catch((error) => {
        setCandidates([]);
        setSelectedCandidateId("");
        setErrorMessage(error instanceof Error ? error.message : "Task 후보를 불러오지 못했어요.");
      });
  }, [selectedPlan?.id]);

  async function handleCreateTask(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const title = taskForm.title.trim();
    if (!title) return;

    const payload: CreateTaskRequest = {
      type: taskForm.type,
      title,
      description: taskForm.description.trim() || null,
      why: taskForm.why.trim() || null,
      targetStartAt: null,
      targetEndAt: null,
    };

    try {
      if (taskForm.parentId) {
        await requestJson(`/tasks/${taskForm.parentId}/children`, { method: "POST", body: JSON.stringify(payload) });
      } else {
        await requestJson("/tasks", { method: "POST", body: JSON.stringify(payload) });
      }
      setTaskForm({ parentId: "", type: "task", title: "", description: "", why: "" });
      await loadWorkspace();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Task를 만들지 못했어요.");
    }
  }

  async function handleCreatePlan(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const title = planForm.title.trim();
    if (!title) return;

    const payload: CreatePlanRequest = {
      title,
      startAt: toIsoDateTime(planForm.startAt),
      endAt: toIsoDateTime(planForm.endAt),
      location: planForm.location.trim() || null,
      memo: planForm.memo.trim() || null,
      estimatedCost: planForm.estimatedCost.trim() || null,
    };

    try {
      const plan = await requestJson<PlanSummary>("/plans", { method: "POST", body: JSON.stringify(payload) });
      const newDate = planForm.startAt.slice(0, 10);
      setSelectedDate(newDate);
      setSelectedPlanId(plan.id);
      setPlanForm(createDefaultPlanForm());
      await loadWorkspace(newDate);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Plan을 만들지 못했어요.");
    }
  }

  function handleTimeSlotSelect(dateInput: string, event: MouseEvent<HTMLElement>): void {
    setPlanForm(createPlanFormFromGridPointer(dateInput, event));
    setSelectedDate(dateInput);
    setActiveTab("write");
  }

  async function handleTogglePlanTask(planTask: PlanTaskSummary): Promise<void> {
    const action = planTask.status === "done" ? "uncheck" : "check";
    try {
      await requestJson(`/plan-tasks/${planTask.planTaskId}/${action}`, { method: "POST" });
      await loadWorkspace();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "PlanTask 상태를 바꾸지 못했어요.");
    }
  }

  async function handleAddCandidate(): Promise<void> {
    if (!selectedPlan || !selectedCandidateId) return;
    try {
      await requestJson(`/plans/${selectedPlan.id}/tasks`, { method: "POST", body: JSON.stringify({ taskId: selectedCandidateId }) });
      await loadWorkspace();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Task를 Plan에 연결하지 못했어요.");
    }
  }

  async function handleAddSupply(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedPlan || !supplyForm.title.trim()) return;
    try {
      await requestJson(`/plans/${selectedPlan.id}/supplies`, { method: "POST", body: JSON.stringify({ title: supplyForm.title.trim() }) });
      setSupplyForm({ title: "" });
      await loadWorkspace();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "준비물을 추가하지 못했어요.");
    }
  }

  async function handleToggleSupply(supply: PlanSupplySummary): Promise<void> {
    try {
      await requestJson(`/plan-supplies/${supply.id}`, { method: "PATCH", body: JSON.stringify({ isChecked: !supply.isChecked }) });
      await loadWorkspace();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "준비물 상태를 바꾸지 못했어요.");
    }
  }

  return (
    <AppLayout
      status={status}
      errorMessage={errorMessage}
      selectedDate={selectedDate}
      activeTab={activeTab}
      onRefresh={() => void loadWorkspace()}
      onDateChange={setSelectedDate}
      onTabChange={setActiveTab}
    >
      {activeTab === "today" ? <TodayPage selectedDate={selectedDate} plans={plans} onTogglePlanTask={handleTogglePlanTask} onTimeSlotSelect={handleTimeSlotSelect} /> : null}

      {activeTab === "planner" ? (
        <div className="screen-stack">
          <ViewTabs
            value={plannerView}
            onChange={setPlannerView}
            items={[
              { value: "month", label: "월간" },
              { value: "week", label: "주간" },
              { value: "day", label: "일간" },
            ]}
          />
          {plannerView === "month" ? <MonthCalendar selectedDate={selectedDate} plans={monthPlans} onSelectDate={setSelectedDate} /> : null}
          {plannerView === "week" ? <WeekPlanner selectedDate={selectedDate} plans={weekPlans} onSelectDate={setSelectedDate} onTimeSlotSelect={handleTimeSlotSelect} /> : null}
          {plannerView === "day" ? <DayPlanner selectedDate={selectedDate} plans={plans} onTogglePlanTask={handleTogglePlanTask} onTimeSlotSelect={handleTimeSlotSelect} /> : null}
        </div>
      ) : null}

      {activeTab === "tasks" ? <TaskListPage view={taskListView} selectedDate={selectedDate} tasks={flatTasks} onViewChange={setTaskListView} /> : null}
      {activeTab === "map" ? <LifeMapPage tasks={tasks} /> : null}
      {activeTab === "write" ? (
        <WritePage
          flatTasks={flatTasks}
          candidates={candidates}
          selectedCandidateId={selectedCandidateId}
          taskForm={taskForm}
          planForm={planForm}
          supplyForm={supplyForm}
          selectedPlan={selectedPlan}
          onTaskFormChange={setTaskForm}
          onPlanFormChange={setPlanForm}
          onSupplyFormChange={setSupplyForm}
          onCreateTask={(event) => void handleCreateTask(event)}
          onCreatePlan={(event) => void handleCreatePlan(event)}
          onSelectCandidate={setSelectedCandidateId}
          onAddCandidate={() => void handleAddCandidate()}
          onAddSupply={(event) => void handleAddSupply(event)}
          onToggleSupply={(supply) => void handleToggleSupply(supply)}
        />
      ) : null}
    </AppLayout>
  );
}


