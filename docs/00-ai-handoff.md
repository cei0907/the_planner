# AI 인계 문서

## 프로젝트 이름

The Planner

## 한 줄 정의

큰 지향점과 프로젝트를 Task Tree로 구조화하고, 실제 시간 슬롯인 Plan에 연결해 오늘의 실행으로 내려오게 만드는 인생설계 플래너.

## 반드시 지켜야 할 핵심 철학

Task와 Plan을 섞지 않는다.

- Task는 의미, 목적, 구조, 완료 상태를 담당한다.
- Plan은 시간, 장소, 준비물, 메모, 비용 같은 실행 맥락을 담당한다.
- Plan 자체에는 완료 상태가 없다.
- Plan 화면에는 체크 UI가 있지만, 체크 대상은 Plan이 아니라 PlanTask다.

## 핵심 문장

> Plan 화면은 그 시간에 해야 할 일을 보여주고, Task 화면은 그 일이 의미하는 구조와 방향을 보여준다.

## 구현 우선순위

1. 객체 모델을 먼저 고정한다.
2. 도메인 규칙을 테스트 가능하게 만든다.
3. DB 스키마와 API는 객체 모델을 훼손하지 않는 방향으로 설계한다.
4. 화면은 객체의 책임을 흐리지 않는 방식으로 구현한다.

## 초기 기술 방향

- Frontend: React + Vite + PWA
- Backend: Node.js + Express
- Database: MariaDB
- Language: TypeScript
- Auth: 단일 사용자 로그인부터 시작하되, 모든 데이터는 `userId`를 가진다.

## MVP 핵심 기능

- 로그인
- Task Tree CRUD
- 최대 5단계 제한
- Task Type: 할 일, 프로젝트, 지향점
- Plan CRUD
- PlanTask 체크
- 상위 Task 완료 시 하위 완료 전파
- Leaf 기준 진행률
- 일간/월간 화면

## 절대 피해야 할 설계

- Plan에 `isDone`을 두지 않는다.
- Task와 Plan을 하나의 테이블이나 하나의 객체로 합치지 않는다.
- 반복을 단순히 Task의 boolean 필드 하나로 처리하지 않는다.
- 상위 Task 진행률을 화면에서 매번 전체 Tree 순회로만 계산하지 않는다.
- UI 편의 때문에 도메인 규칙을 컴포넌트 안에 흩뿌리지 않는다.

