import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { PlanSummary, PlanSupplySummary, PlanTaskSummary, TaskCandidate, TaskId } from "@the-planner/shared";
import type { PlanEditFormState, SupplyFormState } from "./types";
import { formatTimeRange } from "./date";

export function PlanPanel({
  plans,
  selectedPlan,
  planEditForm,
  selectedCandidateId,
  candidates,
  supplyForm,
  onSelectPlan,
  onPlanEditFormChange,
  onUpdatePlan,
  onDeletePlan,
  onSelectCandidate,
  onAddCandidate,
  onTogglePlanTask,
  onRemovePlanTask,
  onSupplyFormChange,
  onAddSupply,
  onToggleSupply,
  onRenameSupply,
  onDeleteSupply,
}: {
  plans: PlanSummary[];
  selectedPlan: PlanSummary | null;
  planEditForm: PlanEditFormState;
  selectedCandidateId: TaskId | "";
  candidates: TaskCandidate[];
  supplyForm: SupplyFormState;
  onSelectPlan: (planId: string) => void;
  onPlanEditFormChange: Dispatch<SetStateAction<PlanEditFormState>>;
  onUpdatePlan: (event: FormEvent<HTMLFormElement>) => void;
  onDeletePlan: () => void;
  onSelectCandidate: (taskId: TaskId | "") => void;
  onAddCandidate: () => void;
  onTogglePlanTask: (planTask: PlanTaskSummary) => void;
  onRemovePlanTask: (planTask: PlanTaskSummary) => void;
  onSupplyFormChange: (state: SupplyFormState) => void;
  onAddSupply: (event: FormEvent<HTMLFormElement>) => void;
  onToggleSupply: (supply: PlanSupplySummary) => void;
  onRenameSupply: (supply: PlanSupplySummary, title: string) => void;
  onDeleteSupply: (supply: PlanSupplySummary) => void;
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

          <form className="plan-edit-form" onSubmit={onUpdatePlan}>
            <label>
              <span>제목</span>
              <input
                value={planEditForm.title}
                onChange={(event) => onPlanEditFormChange((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <div className="edit-grid">
              <label>
                <span>시작</span>
                <input
                  type="datetime-local"
                  value={planEditForm.startAt}
                  onChange={(event) => onPlanEditFormChange((current) => ({ ...current, startAt: event.target.value }))}
                />
              </label>
              <label>
                <span>종료</span>
                <input
                  type="datetime-local"
                  value={planEditForm.endAt}
                  onChange={(event) => onPlanEditFormChange((current) => ({ ...current, endAt: event.target.value }))}
                />
              </label>
            </div>
            <div className="edit-grid">
              <label>
                <span>장소</span>
                <input
                  value={planEditForm.location}
                  onChange={(event) => onPlanEditFormChange((current) => ({ ...current, location: event.target.value }))}
                />
              </label>
              <label>
                <span>예상 비용</span>
                <input
                  inputMode="decimal"
                  value={planEditForm.estimatedCost}
                  onChange={(event) => onPlanEditFormChange((current) => ({ ...current, estimatedCost: event.target.value }))}
                />
              </label>
            </div>
            <label>
              <span>실제 비용</span>
              <input
                inputMode="decimal"
                value={planEditForm.actualCost}
                onChange={(event) => onPlanEditFormChange((current) => ({ ...current, actualCost: event.target.value }))}
              />
            </label>
            <label>
              <span>메모</span>
              <textarea
                value={planEditForm.memo}
                onChange={(event) => onPlanEditFormChange((current) => ({ ...current, memo: event.target.value }))}
                rows={3}
              />
            </label>
            <div className="button-row">
              <button type="submit">Plan 저장</button>
              <button type="button" className="danger-button" onClick={onDeletePlan}>
                Plan 삭제
              </button>
            </div>
          </form>

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
                <button type="button" className="icon-text-button" onClick={() => onRemovePlanTask(planTask)}>
                  제거
                </button>
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
                <input
                  type="checkbox"
                  checked={supply.isChecked}
                  onChange={() => onToggleSupply(supply)}
                  aria-label={`${supply.title} 체크`}
                />
                <input
                  defaultValue={supply.title}
                  onBlur={(event) => onRenameSupply(supply, event.target.value)}
                  aria-label={`${supply.title} 이름`}
                />
                <button type="button" className="icon-text-button" onClick={() => onDeleteSupply(supply)}>
                  삭제
                </button>
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
