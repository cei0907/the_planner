import { TASK_MAX_LEVEL, type TaskType } from "@the-planner/shared";

const taskTypes: Array<{ type: TaskType; label: string; description: string }> = [
  {
    type: "aspiration",
    label: "지향점",
    description: "아직 구조가 흐릿한 삶의 방향과 욕망",
  },
  {
    type: "project",
    label: "프로젝트",
    description: "여러 Task를 묶는 목표 단위",
  },
  {
    type: "task",
    label: "할 일",
    description: "Plan에 배치되어 실행되는 기본 항목",
  },
];

export function App() {
  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">The Planner</p>
            <h1>큰 계획을 오늘의 시간으로 내려오기</h1>
          </div>
          <button type="button">새 Plan</button>
        </header>

        <div className="layout">
          <section className="panel task-panel" aria-labelledby="task-heading">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Task Tree</p>
                <h2 id="task-heading">의미와 방향</h2>
              </div>
              <span>{TASK_MAX_LEVEL}단계</span>
            </div>

            <div className="task-path">
              <strong>경제적으로 자유로워지기</strong>
              <span>수입원 만들기</span>
              <span>작은 서비스 출시하기</span>
              <span>랜딩 페이지 초안 작성</span>
            </div>

            <div className="progress">
              <span>Leaf 기준 진행률</span>
              <strong>3 / 12</strong>
            </div>
          </section>

          <section className="panel plan-panel" aria-labelledby="plan-heading">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Today Plan</p>
                <h2 id="plan-heading">시간과 실행 맥락</h2>
              </div>
              <span>09:00-11:00</span>
            </div>

            <ul className="plan-list">
              <li>
                <input type="checkbox" />
                <span>랜딩 페이지 문구 정리</span>
              </li>
              <li>
                <input type="checkbox" />
                <span>첫 화면 와이어프레임 만들기</span>
              </li>
              <li>
                <input type="checkbox" />
                <span>준비물: 노트북, 충전기</span>
              </li>
            </ul>
          </section>
        </div>

        <section className="type-strip" aria-label="Task type">
          {taskTypes.map((item) => (
            <article key={item.type}>
              <strong>{item.label}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
