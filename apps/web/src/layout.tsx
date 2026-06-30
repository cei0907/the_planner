import type { ApiState } from "./types";

function AppStatus({
  status,
  errorMessage,
}: {
  status: ApiState;
  errorMessage: string | null;
}) {
  if (status === "loading") {
    return <span className="status-pill loading">동기화 중</span>;
  }

  if (status === "error") {
    return <span className="status-pill error">{errorMessage ?? "오류"}</span>;
  }

  return <span className="status-pill">연결됨</span>;
}

export function AppLayout({
  status,
  errorMessage,
  selectedDate,
  children,
  onRefresh,
  onDateChange,
}: {
  status: ApiState;
  errorMessage: string | null;
  selectedDate: string;
  children: React.ReactNode;
  onRefresh: () => void;
  onDateChange: (date: string) => void;
}) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">The Planner</p>
          <h1>오늘 할 일을 의미 있는 구조에서 꺼내오기</h1>
        </div>

        <nav className="nav-tabs" aria-label="Workspace">
          <a href="#month">Month</a>
          <a href="#tasks">Task Tree</a>
          <a href="#plans">Today Plan</a>
          <a href="#compose">Create</a>
        </nav>

        <div className="sidebar-footer">
          <AppStatus status={status} errorMessage={errorMessage} />
          <button type="button" className="ghost-button" onClick={onRefresh}>
            새로고침
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">MVP Workspace</p>
            <h2>Task를 만들고 Plan에 배치한 뒤 실행 체크까지 확인합니다.</h2>
          </div>
          <label className="date-control">
            <span>날짜</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
            />
          </label>
        </header>

        <div className="dashboard-grid">{children}</div>
      </section>
    </main>
  );
}
