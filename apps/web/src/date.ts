import type { PlanSummary } from "@the-planner/shared";

export function getTodayInputDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toDateTimeInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function dayRange(dateInput: string): { from: string; to: string } {
  const from = new Date(`${dateInput}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function weekRange(dateInput: string): { from: string; to: string } {
  const date = new Date(`${dateInput}T00:00:00`);
  const from = new Date(date);
  from.setDate(date.getDate() - date.getDay());
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(from.getDate() + 7);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function monthRange(dateInput: string): { from: string; to: string } {
  const date = new Date(`${dateInput}T00:00:00`);
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function yearRange(dateInput: string): { from: string; to: string } {
  const date = new Date(`${dateInput}T00:00:00`);
  const from = new Date(date.getFullYear(), 0, 1);
  const to = new Date(date.getFullYear() + 1, 0, 1);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toIsoDateTime(inputValue: string): string {
  return new Date(inputValue).toISOString();
}

export function formatTimeRange(plan: Pick<PlanSummary, "startAt" | "endAt">): string {
  const start = new Date(plan.startAt);
  const end = new Date(plan.endAt);
  return `${start.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function formatDateLabel(dateInput: string): string {
  return new Date(`${dateInput}T00:00:00`).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}
