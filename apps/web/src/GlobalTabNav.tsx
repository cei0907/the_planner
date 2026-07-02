import type { FirstScreenView } from "./firstScreenTypes";

const tabs: Array<{ id: FirstScreenView; icon: string; label: string }> = [
  { id: "designer", icon: "🛠️", label: "계획 만들기" },
  { id: "focus", icon: "🎯", label: "오늘 집중" },
  { id: "scheduler", icon: "🗓️", label: "일정 보기" },
];

export function GlobalTabNav({
  activeView,
  onViewChange,
}: {
  activeView: FirstScreenView;
  onViewChange: (view: FirstScreenView) => void;
}) {
  return (
    <nav className="first-triad" aria-label="Planner sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={activeView === tab.id ? "active" : ""}
          onClick={() => onViewChange(tab.id)}
        >
          <span aria-hidden="true">{tab.icon}</span>
          <strong>{tab.label}</strong>
        </button>
      ))}
    </nav>
  );
}
