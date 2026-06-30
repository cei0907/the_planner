import type { PlanSummary } from "@the-planner/shared";
import { toInputDate } from "./date";

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

function buildCalendarDays(selectedDate: string): Array<{ date: string; isCurrentMonth: boolean }> {
  const anchor = new Date(`${selectedDate}T00:00:00`);
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);

    return {
      date: toInputDate(day),
      isCurrentMonth: day.getMonth() === anchor.getMonth(),
    };
  });
}

function groupPlansByDate(plans: PlanSummary[]): Map<string, PlanSummary[]> {
  return plans.reduce((groups, plan) => {
    const key = toInputDate(new Date(plan.startAt));
    const plansForDay = groups.get(key) ?? [];
    plansForDay.push(plan);
    groups.set(key, plansForDay);
    return groups;
  }, new Map<string, PlanSummary[]>());
}

export function MonthPanel({
  selectedDate,
  plans,
  onSelectDate,
}: {
  selectedDate: string;
  plans: PlanSummary[];
  onSelectDate: (date: string) => void;
}) {
  const days = buildCalendarDays(selectedDate);
  const plansByDate = groupPlansByDate(plans);
  const anchor = new Date(`${selectedDate}T00:00:00`);
  const monthLabel = anchor.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });

  return (
    <section className="panel month-panel" id="month" aria-labelledby="month-heading">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Month Plan</p>
          <h3 id="month-heading">{monthLabel}</h3>
        </div>
        <span className="metric">{plans.length}개 Plan</span>
      </div>

      <div className="month-weekdays" aria-hidden="true">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="month-grid">
        {days.map((day) => {
          const dayPlans = plansByDate.get(day.date) ?? [];
          const isSelected = day.date === selectedDate;

          return (
            <button
              key={day.date}
              type="button"
              className={[
                "month-day",
                day.isCurrentMonth ? "" : "muted",
                isSelected ? "selected" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => onSelectDate(day.date)}
            >
              <span>{Number(day.date.slice(8, 10))}</span>
              {dayPlans.length > 0 ? (
                <strong>{dayPlans.length}</strong>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
