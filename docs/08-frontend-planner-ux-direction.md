# Frontend Planner UX Direction

이 문서는 2026-07-01 프론트엔드 방향 전환 작업의 의도와 구현 내용을 정리한다.

## 배경

초기 구현은 Task, Plan, PlanTask, TaskProgress 같은 백엔드 도메인 구조를 비교적 충실하게 화면에 노출했다. 구조적으로는 맞았지만, 사용자가 보는 외형은 감성적인 플래너라기보다 데이터 관리용 CRUD 화면에 가까웠다.

The Planner의 실제 제품 경험은 다음 감각에 가까워야 한다.

- 사용자가 한 번 써보고 싶어야 한다.
- 자신의 삶의 계획을 적어보고 싶어야 한다.
- Task와 Plan의 내부 구조보다, 오늘과 이번 주, 이번 달의 흐름이 먼저 보여야 한다.
- PC보다 mobile phone을 우선 고려하고, tablet/pad를 그다음, PC를 마지막 확장 화면으로 다룬다.

## 핵심 UX 원칙

### 1. Mobile first

Phone에서는 한 번에 한 화면만 보여준다. 여러 패널을 동시에 펼치지 않는다.

Phone의 기본 구조는 하단 탭이다.

- 오늘
- 플래너
- Task List
- 삶의 지도
- 쓰기

각 탭은 하나의 목적만 가진다. 사용자가 작은 화면에서 길을 잃지 않도록 한다.

### 2. Tablet as digital paper planner

Tablet/pad에서는 종이 플래너를 펼친 듯한 감각을 살린다.

- 월간 페이지
- 주간 시간표
- 일간 24시간 계획표
- 목표와 계획을 적는 넓은 입력면

Tablet은 phone보다 넓지만 PC처럼 관리 도구가 되어서는 안 된다. 여백과 페이지 감각을 유지한다.

### 3. PC as management expansion

PC에서는 같은 정보를 더 넓고 편하게 관리할 수 있게 한다.

- 주간/일간 시간표를 더 넓게 표시
- Task List와 삶의 지도를 스캔하기 쉽게 표시
- 키보드 입력과 빠른 수정이 편한 구조

단, PC에서도 제품 정체성은 업무용 어드민이 아니라 플래너여야 한다.

## 화면 구조

### 오늘

가장 먼저 보는 화면이다.

역할:

- 오늘 날짜를 보여준다.
- 오늘의 Plan을 24시간 시간표로 보여준다.
- 각 Plan 안의 PlanTask를 체크할 수 있게 한다.
- 오늘 하루를 어떤 식으로 쓸지 생각하게 만든다.

현재 구현:

- `TodayPage`
- `DayPlanner`
- 오늘 날짜 라벨
- 오늘 시간 블록 수
- 완료한 PlanTask 수

### 플래너

시간표 중심 화면이다.

하위 탭:

- 월간
- 주간
- 일간

월간:

- 일반 월간 캘린더 형태
- 각 날짜에 Plan 개수와 대표 Plan 제목 표시
- 날짜 선택 시 기준 날짜 변경

주간:

- x축: 일, 월, 화, 수, 목, 금, 토
- y축: 00:00부터 24:00까지
- Plan을 시간 블록으로 표시
- phone에서는 가로 스크롤 가능

일간:

- 24시간 세로 시간표
- Plan 상세 카드
- Plan 안에 연결된 Task 체크리스트

현재 구현:

- `MonthCalendar`
- `WeekPlanner`
- `DayPlanner`
- `PlanTimeBlock`

### Task List

시간표가 아니라 기간별 할 일 목록이다.

하위 탭:

- 연간
- 월간
- 주간
- 일간

역할:

- 해당 기간에 관련된 Task를 리스트로 보여준다.
- 목표 기간이 있는 Task는 기간 겹침 기준으로 보여준다.
- 목표 기간이 없는 Task도 아직 배치되지 않은 생각/목표로 볼 수 있게 포함한다.
- Task의 진행률을 Leaf 기준으로 보여준다.

현재 구현:

- `TaskListPage`
- `yearRange`, `monthRange`, `weekRange`, `dayRange`
- 기간별 Task 필터링

### 삶의 지도

기존 Task Tree의 감성적인 표현이다.

역할:

- 지향점, 프로젝트, 할 일이 어떻게 연결되는지 보여준다.
- 사용자가 자신의 삶의 구조와 방향을 바라보게 한다.
- 내부 용어인 Task Tree를 사용자에게 그대로 강요하지 않는다.

현재 구현:

- `LifeMapPage`
- `TaskTree`
- `지향점`, `프로젝트`, `할 일` 라벨
- Why 또는 description 표시
- Leaf 기준 진행률 표시

### 쓰기

새 목표와 시간 블록을 입력하는 화면이다.

역할:

- 사용자가 목표를 적는다.
- 왜 중요한지 적는다.
- Plan으로 시간을 잡는다.
- 선택된 Plan에 Task와 준비물을 연결한다.

표현 원칙:

- `Task 생성` 대신 `새 목표 적기`
- `Plan 생성` 대신 `시간에 올리기`
- `Why` 대신 `왜 중요한가요?`
- 데이터 입력 폼이 아니라 플래너 질문지처럼 느껴지게 한다.

현재 구현:

- `WritePage`
- Task 생성 폼
- Plan 생성 폼
- 선택된 Plan에 Task 연결
- 선택된 Plan에 준비물 추가

## 기존 구조와의 연결

이번 작업은 백엔드 구조를 바꾸지 않았다.

계속 사용하는 기존 개념:

- Task: 의미, 목표, 계층 구조
- Plan: 시간 슬롯과 현장 맥락
- PlanTask: 특정 Plan 안에서 실행할 Task와 체크 상태
- PlanSupply: Plan에 필요한 준비물
- TaskProgress: Leaf 기준 진행률

프론트에서 바뀐 것은 이 구조를 보여주는 방식이다.

이전 방식:

```text
Month + Task Tree + Detail + Today Plan + Create 패널을 한 화면에 배치
```

새 방식:

```text
오늘 / 플래너 / Task List / 삶의 지도 / 쓰기를 탭으로 분리
```

즉, 데이터 구조는 유지하되 사용자의 mental model에 맞게 화면을 재배열했다.

## 반응형 우선순위

### Phone

- 하단 탭 고정
- 한 번에 하나의 화면
- 가로 스크롤 가능한 주간 시간표
- 입력은 짧은 질문 단위
- 가장 중요한 화면은 오늘과 쓰기

### Tablet / Pad

- 넓은 플래너 페이지
- 월간/주간/일간이 종이 플래너처럼 보이도록 구성
- 입력 폼은 두 칸 배치 가능
- 여백과 읽기 흐름 유지

### PC

- 넓은 시간표와 목록을 편하게 스캔
- 상단형 탭처럼 동작
- 관리 효율은 높이되, 어드민 UI처럼 보이지 않게 유지

## 이번 변경 파일

- `apps/web/src/App.tsx`
  - 탭 기반 화면 구조로 재구성
  - 오늘, 플래너, Task List, 삶의 지도, 쓰기 화면 추가
  - 월간/주간/일간 플래너 구현
  - 연간/월간/주간/일간 Task List 구현

- `apps/web/src/layout.tsx`
  - mobile first 하단 탭 레이아웃으로 변경
  - 상태, 날짜 선택, 새로고침을 상단 영역으로 정리

- `apps/web/src/date.ts`
  - `weekRange`, `yearRange`, `formatDateLabel` 추가

- `apps/web/src/styles.css`
  - 감성 플래너 톤의 색상과 종이 질감 기반 스타일로 교체
  - phone, tablet, PC 반응형 구조 정리
  - 월간 캘린더, 주간 7x24 시간표, 일간 24시간표 스타일 추가

## 검증 결과

변경 후 다음 명령을 통과했다.

```powershell
npm run typecheck
npm run build
npm test
```

테스트 결과:

- shared package test 1 file passed
- 8 tests passed

## 다음 작업 제안

1. API/DB가 켜진 상태에서 실제 데이터로 모바일 화면 QA
2. 주간/일간 시간 블록의 실제 위치 계산 고도화
3. Plan 상세 편집을 새 플래너 UI 안으로 통합
4. Task 목표 기간 입력 UI 추가
5. PlanTask 체크 시 원본 Task 완료/진행률 반영 정책 구현
6. 반복 계획 UI 설계
7. PWA 설치 경험과 모바일 홈 화면 아이콘 추가

## 2026-07-01 추가 UX 조정

### 시간표 터치로 Plan 초안 만들기

주간/일간 시간표는 단순 조회 화면이 아니라 입력 표면이어야 한다.

사용자가 주간 또는 일간의 빈 시간대를 클릭하거나 터치하면 다음 동작을 수행한다.

- 터치한 y 좌표를 24시간 중 대략적인 시간으로 변환한다.
- 시작 시간은 30분 단위로 반올림한다.
- 종료 시간은 기본 1시간 뒤로 잡는다.
- `쓰기` 탭으로 이동한다.
- Plan 생성 폼의 시작/종료 시간이 자동으로 채워진다.

이 기능은 사용자가 시간을 직접 입력하기 전에, 먼저 시간표 위에 계획을 올려보는 감각을 준다.

현재 구현:

- `createPlanFormFromGridPointer`
- `handleTimeSlotSelect`
- `WeekPlanner`의 요일별 시간 컬럼 클릭
- `DayPlanner`의 24시간 컬럼 클릭
- 기존 Plan 카드와 체크박스 클릭은 전파를 막아 시간 생성과 충돌하지 않게 처리

### Glassy planner visual reference

사용자가 제공한 `preview (1).html`의 스타일을 참고해 표면 디자인을 조정했다.

참고한 방향:

- 파란 계열의 밝은 그라데이션 배경
- 반투명 glass panel
- blur와 soft shadow
- segmented view tabs
- 선명한 월간 calendar table
- 색상 있는 일정 block

그대로 복제하지 않고, 현재 앱의 mobile-first 탭 구조와 The Planner 도메인에 맞게 흡수했다.

현재 구현:

- `styles.css`의 색상 토큰을 blue glass 계열로 조정
- 상단 영역, 탭, planner page, form을 glass surface로 변경
- 월간 캘린더를 table-like grid로 강화
- 주간/일간 시간표를 glass panel 위의 time grid로 조정
- Plan block을 gradient event block처럼 표현
