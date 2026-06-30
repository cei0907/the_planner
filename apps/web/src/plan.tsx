import type { FormEvent } from "react";
import type { PlanSummary, PlanTaskSummary, TaskCandidate, TaskId } from "@the-planner/shared";
import type { SupplyFormState } from "./types";
import { formatTimeRange } from "./date";

export function PlanPanel({
  plans,
  selectedPlan,
  selectedCandidateId,
  candidates,
  supplyForm,
  onSelectPlan,
  onSelectCandidate,
  onAddCandidate,
  onTogglePlanTask,
  onSupplyFormChange,
  onAddSupply,
}: {
  plans: PlanSummary[];
  selectedPlan: PlanSummary | null;
  selectedCandidateId: TaskId | "";
  candidates: TaskCandidate[];
  supplyForm: SupplyFormState;
  onSelectPlan: (planId: string) => void;
  onSelectCandidate: (taskId: TaskId | "") => void;
  onAddCandidate: () => void;
  onTogglePlanTask: (planTask: PlanTaskSummary) => void;
  onSupplyFormChange: (state: SupplyFormState) => void;
  onAddSupply: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const donePlanTaskCount = selectedPlan?.tasks.filter((task) => task.status === "done").length ?? 0;

  return (
    <section className="panel plan-panel" id="plans" aria-labelledby="plans-heading">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Today Plan</p>
          <h3 id="plans-heading">시간 슬롯</h3>
        </div>
        <span className="metric">{plans.length}개 Plan</span>
      </div>

      <div className="plan-tabs" role="list" aria-label="Plan list">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            className={plan.id === selectedPlan?.id ? "plan-tab active" : "plan-tab"}
            onClick={() => onSelectPlan(plan.id)}
          >
            <span>{formatTimeRange(plan)}</span>
            <strong>{plan.title}</strong>
          </button>
        ))}
      </div>

      {selectedPlan ? (
        <div className="plan-detail">
          <div className="plan-summary">
            <div>
              <h4>{selectedPlan.title}</h4>
              <p>{selectedPlan.location || "장소 미정"}</p>
            </div>
            <strong>{donePlanTaskCount}/{selectedPlan.tasks.length}</strong>
          </div>

          <ul className="check-list">
            {selectedPlan.tasks.map((planTask) => (
              <li key={planTask.planTaskId}>
                <label>
                  <input
                    type="checkbox"
                    checked={planTask.status === "done"}
                    onChange={() => onTogglePlanTask(planTask)}
                  />
                  <span>{planTask.title}</span>
                </label>
              </li>
            ))}
            {selectedPlan.tasks.length === 0 ? (
              <li className="empty-row">아직 연결된 Task가 없습니다.</li>
            ) : null}
          </ul>

          <div className="inline-controls">
            <select
              value={selectedCandidateId}
              onChange={(event) => onSelectCandidate(event.target.value)}
              disabled={candidates.length === 0}
            >
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title} {candidate.isLeaf ? "" : `(${candidate.leafCount}개 leaf)`}
                </option>
              ))}
            </select>
            <button type="button" onClick={onAddCandidate} disabled={!selectedCandidateId}>
              배치
            </button>
          </div>

          <form className="inline-controls" onSubmit={onAddSupply}>
            <input
              value={supplyForm.title}
              onChange={(event) => onSupplyFormChange({ title: event.target.value })}
              placeholder="준비물"
            />
            <button type="submit">추가</button>
          </form>

          <ul className="supply-list">
            {selectedPlan.supplies.map((supply) => (
              <li key={supply.id}>
                <span>{supply.isChecked ? "✓" : "□"}</span>
                {supply.title}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="empty-copy">오늘 날짜에 Plan이 없습니다.</p>
      )}
    </section>
  );
}
