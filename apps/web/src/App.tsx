import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  type CreatePlanRequest,
  type CreateTaskRequest,
  type ListResponse,
  type PlanSummary,
  type PlanTaskSummary,
  type TaskCandidate,
  type TaskId,
  type TaskTreeNode,
  type UpdateTaskRequest,
} from "@the-planner/shared";
import { requestJson } from "./api";
import { ComposePanel } from "./compose";
import { dayRange, getTodayInputDate, toDateTimeInput, toIsoDateTime } from "./date";
import { AppLayout } from "./layout";
import { PlanPanel } from "./plan";
import { flattenTasks, TaskDetailPanel, TaskPanel } from "./task";
import type { ApiState, PlanFormState, SupplyFormState, TaskEditFormState, TaskFormState } from "./types";

function createDefaultPlanForm(): PlanFormState {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    title: "",
    startAt: toDateTimeInput(start),
    endAt: toDateTimeInput(end),
    location: "",
    memo: "",
    estimatedCost: "",
  };
}

export function App() {
  const [status, setStatus] = useState<ApiState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskTreeNode[]>([]);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayInputDate);
  const [selectedTaskId, setSelectedTaskId] = useState<TaskId | "">("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | "">("");
  const [candidates, setCandidates] = useState<TaskCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<TaskId | "">("");
  const [taskForm, setTaskForm] = useState<TaskFormState>({
    parentId: "",
    type: "task",
    title: "",
    description: "",
    why: "",
  });
  const [taskEditForm, setTaskEditForm] = useState<TaskEditFormState>({
    type: "task",
    title: "",
    description: "",
    why: "",
  });
  const [planForm, setPlanForm] = useState<PlanFormState>(createDefaultPlanForm);
  const [supplyForm, setSupplyForm] = useState<SupplyFormState>({ title: "" });

  const flatTasks = useMemo(() => flattenTasks(tasks), [tasks]);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;
  const selectedTask = flatTasks.find((task) => task.id === selectedTaskId) ?? null;

  async function loadWorkspace(dateInput = selectedDate): Promise<void> {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const range = dayRange(dateInput);
      const [taskTree, planList] = await Promise.all([
        requestJson<ListResponse<TaskTreeNode>>("/tasks/tree"),
        requestJson<ListResponse<PlanSummary>>(`/plans?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`),
      ]);

      setTasks(taskTree.items);
      setPlans(planList.items);
      setSelectedPlanId((current) => {
        if (current && planList.items.some((plan) => plan.id === current)) {
          return current;
        }

        return planList.items[0]?.id ?? "";
      });
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    void loadWorkspace(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedTask) {
      setTaskEditForm({
        type: "task",
        title: "",
        description: "",
        why: "",
      });
      return;
    }

    setTaskEditForm({
      type: selectedTask.type,
      title: selectedTask.title,
      description: selectedTask.description ?? "",
      why: selectedTask.why ?? "",
    });
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!selectedPlan?.id) {
      setCandidates([]);
      setSelectedCandidateId("");
      return;
    }

    requestJson<ListResponse<TaskCandidate>>(`/plans/${selectedPlan.id}/task-candidates`)
      .then((response) => {
        setCandidates(response.items);
        setSelectedCandidateId(response.items[0]?.id ?? "");
      })
      .catch((error) => {
        setCandidates([]);
        setSelectedCandidateId("");
        setErrorMessage(error instanceof Error ? error.message : "Task 후보를 불러오지 못했습니다.");
      });
  }, [selectedPlan?.id]);

  async function handleCreateTask(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const title = taskForm.title.trim();
    if (!title) {
      return;
    }

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
        await requestJson(`/tasks/${taskForm.parentId}/children`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson("/tasks", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setTaskForm((current) => ({
        ...current,
        title: "",
        description: "",
        why: "",
      }));
      await loadWorkspace();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Task를 만들지 못했습니다.");
    }
  }

  async function handleUpdateTask(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!selectedTask || !taskEditForm.title.trim()) {
      return;
    }

    const payload: UpdateTaskRequest = {
      type: taskEditForm.type,
      title: taskEditForm.title.trim(),
      description: taskEditForm.description.trim() || null,
      why: taskEditForm.why.trim() || null,
    };

    try {
      await requestJson(`/tasks/${selectedTask.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await loadWorkspace();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Task를 수정하지 못했습니다.");
    }
  }

  async function handleToggleTaskDone(): Promise<void> {
    if (!selectedTask) {
      return;
    }

    const action = selectedTask.status === "done" ? "uncomplete" : "complete";

    try {
      await requestJson(`/tasks/${selectedTask.id}/${action}`, {
        method: "POST",
      });
      await loadWorkspace();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Task 완료 상태를 바꾸지 못했습니다.");
    }
  }

  async function handleDeleteTask(): Promise<void> {
    if (!selectedTask) {
      return;
    }

    const confirmed = window.confirm(`"${selectedTask.title}" Task를 삭제할까요? 하위 Task도 함께 삭제됩니다.`);
    if (!confirmed) {
      return;
    }

    try {
      await requestJson(`/tasks/${selectedTask.id}`, {
        method: "DELETE",
      });
      setSelectedTaskId("");
      await loadWorkspace();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Task를 삭제하지 못했습니다.");
    }
  }

  async function handleCreatePlan(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const title = planForm.title.trim();
    if (!title) {
      return;
    }

    const payload: CreatePlanRequest = {
      title,
      startAt: toIsoDateTime(planForm.startAt),
      endAt: toIsoDateTime(planForm.endAt),
      location: planForm.location.trim() || null,
      memo: planForm.memo.trim() || null,
      estimatedCost: planForm.estimatedCost.trim() || null,
    };

    try {
      const plan = await requestJson<PlanSummary>("/plans", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const newSelectedDate = planForm.startAt.slice(0, 10);

      setSelectedDate(newSelectedDate);
      setSelectedPlanId(plan.id);
      setPlanForm((current) => ({
        ...current,
        title: "",
        location: "",
        memo: "",
        estimatedCost: "",
      }));
      await loadWorkspace(newSelectedDate);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Plan을 만들지 못했습니다.");
    }
  }

  async function handleAddCandidate(): Promise<void> {
    if (!selectedPlan || !selectedCandidateId) {
      return;
    }

    try {
      await requestJson(`/plans/${selectedPlan.id}/tasks`, {
        method: "POST",
        body: JSON.stringify({ taskId: selectedCandidateId }),
      });
      await loadWorkspace();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Task를 Plan에 배치하지 못했습니다.");
    }
  }

  async function handleTogglePlanTask(planTask: PlanTaskSummary): Promise<void> {
    const action = planTask.status === "done" ? "uncheck" : "check";

    try {
      await requestJson(`/plan-tasks/${planTask.planTaskId}/${action}`, {
        method: "POST",
      });
      await loadWorkspace();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "PlanTask 상태를 바꾸지 못했습니다.");
    }
  }

  async function handleAddSupply(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!selectedPlan || !supplyForm.title.trim()) {
      return;
    }

    try {
      await requestJson(`/plans/${selectedPlan.id}/supplies`, {
        method: "POST",
        body: JSON.stringify({ title: supplyForm.title.trim() }),
      });
      setSupplyForm({ title: "" });
      await loadWorkspace();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "준비물을 추가하지 못했습니다.");
    }
  }

  return (
    <AppLayout
      status={status}
      errorMessage={errorMessage}
      selectedDate={selectedDate}
      onRefresh={() => void loadWorkspace()}
      onDateChange={setSelectedDate}
    >
      <TaskPanel
        tasks={tasks}
        flatTasks={flatTasks}
        selectedTaskId={selectedTaskId}
        onSelectTask={setSelectedTaskId}
      />
      <TaskDetailPanel
        selectedTask={selectedTask}
        editForm={taskEditForm}
        onEditFormChange={setTaskEditForm}
        onUpdateTask={(event) => void handleUpdateTask(event)}
        onToggleTaskDone={() => void handleToggleTaskDone()}
        onDeleteTask={() => void handleDeleteTask()}
      />
      <PlanPanel
        plans={plans}
        selectedPlan={selectedPlan}
        selectedCandidateId={selectedCandidateId}
        candidates={candidates}
        supplyForm={supplyForm}
        onSelectPlan={setSelectedPlanId}
        onSelectCandidate={setSelectedCandidateId}
        onAddCandidate={() => void handleAddCandidate()}
        onTogglePlanTask={(planTask) => void handleTogglePlanTask(planTask)}
        onSupplyFormChange={setSupplyForm}
        onAddSupply={(event) => void handleAddSupply(event)}
      />
      <ComposePanel
        flatTasks={flatTasks}
        taskForm={taskForm}
        planForm={planForm}
        onTaskFormChange={setTaskForm}
        onPlanFormChange={setPlanForm}
        onCreateTask={(event) => void handleCreateTask(event)}
        onCreatePlan={(event) => void handleCreatePlan(event)}
      />
    </AppLayout>
  );
}
