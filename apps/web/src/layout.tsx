import type { ApiState } from "./types";

export type PrimaryTab = "today" | "planner" | "tasks" | "map" | "write";

const primaryTabs: Array<{ id: PrimaryTab; label: string; shortLabel: string }> = [
  { id: "today", label: "오늘", shortLabel: "오늘" },
  { id: "planner", label: "플래너", shortLabel: "계획" },
  { id: "tasks", label: "Task List", shortLabel: "목록" },
  { id: "map", label: "삶의 지도", shortLabel: "지도" },
  { id: "write", label: "쓰기", shortLabel: "쓰기" },
];

function AppStatus({
  status,
  errorMessage,
}: {
  status: ApiState;
  errorMessage: string | null;
}) {
  if (status === "loading") {
    return <span className="status-pill loading">불러오는 중</span>;
  }

  if (status === "error") {
    return <span className="status-pill error">{errorMessage ?? "오류가 생겼어요"}</span>;
  }

  return <span className="status-pill">저장됨</span>;
}

export function AppLayout({
  status,
  errorMessage,
  selectedDate,
  activeTab,
  children,
  onRefresh,
  onDateChange,
  onTabChange,
}: {
  status: ApiState;
  errorMessage: string | null;
  selectedDate: string;
  activeTab: PrimaryTab;
  children: React.ReactNode;
  onRefresh: () => void;
  onDateChange: (date: string) => void;
  onTabChange: (tab: PrimaryTab) => void;
}) {
  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="brand-block">
          <p className="eyebrow">The Planner</p>
          <h1>내 삶을 시간 위에 조용히 올려두는 플래너</h1>
        </div>

        <div className="topbar-actions">
          <label className="date-control">
            <span>기준 날짜</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
            />
          </label>
          <button type="button" className="ghost-button refresh-button" onClick={onRefresh}>
            새로고침
          </button>
          <AppStatus status={status} errorMessage={errorMessage} />
        </div>
      </header>

      <section className="workspace">{children}</section>

      <nav className="bottom-tabs" aria-label="Planner sections">
        {primaryTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? "bottom-tab active" : "bottom-tab"}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-dot" />
            <span className="tab-label-full">{tab.label}</span>
            <span className="tab-label-short">{tab.shortLabel}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
