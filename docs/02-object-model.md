# 객체 모델

이 문서는 객체의 책임과 금지사항을 정의한다.

## User

### 책임

- 앱 데이터의 소유자를 표현한다.
- 초기에는 단일 사용자만 사용하더라도 모든 핵심 객체는 `userId`를 가진다.

### 금지사항

- Task나 Plan의 도메인 규칙을 User에 넣지 않는다.

## Task

### 책임

- 제목, 설명, Why를 가진다.
- Task Type을 가진다.
- 부모 Task와 자식 Task를 통해 Tree를 구성한다.
- 최대 5단계 제한을 지킨다.
- 완료 상태를 가진다.
- 상위 Task 완료 시 하위 Task 전체 완료 전파의 출발점이 된다.
- Leaf 기준 진행률 계산의 대상이 된다.

### 주요 필드

- `id`
- `userId`
- `parentId`
- `type`
- `title`
- `description`
- `why`
- `level`
- `status`
- `targetStartAt`
- `targetEndAt`
- `createdAt`
- `updatedAt`

### 금지사항

- Plan의 장소, 준비물, 비용을 Task에 넣지 않는다.
- 반복 규칙 전체를 Task 안에 직접 밀어 넣지 않는다.
- 화면 표시용 임시 상태를 Task 도메인 객체에 넣지 않는다.

## TaskProgress

### 책임

- Task별 Leaf 집계값을 가진다.
- Leaf 완료 변경 시 조상 Task들의 진행률을 갱신한다.

### 주요 필드

- `taskId`
- `leafTotalCount`
- `leafDoneCount`
- `progressRate`

### 금지사항

- 진행률 계산을 UI 컴포넌트의 책임으로 넘기지 않는다.

## Plan

### 책임

- 시간 슬롯을 표현한다.
- 장소, 메모, 비용, 준비물 같은 현장성 정보를 가진다.
- 연결된 PlanTask 목록을 가진다.

### 주요 필드

- `id`
- `userId`
- `title`
- `startAt`
- `endAt`
- `location`
- `memo`
- `estimatedCost`
- `actualCost`
- `createdAt`
- `updatedAt`

### 금지사항

- `isDone`을 가지지 않는다.
- Task Tree 구조를 직접 소유하지 않는다.
- Task 완료 전파 규칙을 직접 수행하지 않는다.

## PlanTask

### 책임

- Plan과 Task의 연결을 표현한다.
- Plan 화면에서 체크되는 실행 항목이다.
- 반복 회차의 수행 기록이 될 수 있다.

### 주요 필드

- `id`
- `planId`
- `taskId`
- `status`
- `completedAt`
- `repeatOccurrenceId`

### 금지사항

- Plan 자체를 완료 처리하지 않는다.
- Task Tree의 부모-자식 관계를 변경하지 않는다.

## PlanSupply

### 책임

- Plan에 필요한 준비물 체크리스트를 표현한다.

### 주요 필드

- `id`
- `planId`
- `title`
- `isChecked`

### 금지사항

- Task 완료 상태와 직접 연결하지 않는다.

## RepeatRule

### 책임

- 반복 주기와 종료 조건을 표현한다.
- 반복 Plan 또는 PlanTask 생성을 위한 기준이 된다.

### 주요 필드

- `id`
- `taskId`
- `frequency`
- `intervalValue`
- `weekdays`
- `endType`
- `endAt`
- `occurrenceCount`

### 금지사항

- 반복 회차의 완료 상태를 직접 누적 관리하지 않는다.
- Task의 의미 구조를 변경하지 않는다.

## RepeatOccurrence

### 책임

- 반복으로 만들어진 개별 회차를 표현한다.
- 종료형 반복에서 전체 회차 완료 여부를 판단하는 단위가 된다.

### 주요 필드

- `id`
- `repeatRuleId`
- `scheduledStartAt`
- `scheduledEndAt`
- `status`
- `completedAt`

