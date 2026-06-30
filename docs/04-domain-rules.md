# 도메인 규칙

## Task 깊이 규칙

1. Task는 최대 5단계까지 만들 수 있다.
2. Level1은 최상위 Task다.
3. Level5는 하위 Task를 가질 수 없다.
4. Level1이라도 하위 Task가 없으면 Leaf Task다.

## Task 완료 규칙

1. Task를 완료 처리하면 자기 자신은 done 상태가 된다.
2. 해당 Task의 모든 하위 Task도 done 상태가 된다.
3. 완료 전파는 선택한 Task의 하위 Tree에만 적용된다.
4. 형제 Task에는 영향을 주지 않는다.
5. 완료 해제는 기본적으로 선택한 Task 자기 자신만 미완료 처리한다.
6. 하위 Task까지 완료 해제하는 기능은 추후 옵션으로 둔다.

## 진행률 규칙

1. 진행률은 Leaf Task 기준으로 계산한다.
2. 계산식은 `완료된 Leaf Task 수 / 전체 Leaf Task 수`다.
3. Leaf Task 완료 상태가 바뀌면 해당 Task의 조상 Task들만 갱신한다.
4. 상위 Task를 직접 완료하면 하위 Leaf Task가 모두 done이 되므로 진행률은 100%가 된다.

## Plan 규칙

1. Plan은 시작 일시와 종료 일시를 가진다.
2. Plan은 완료 상태를 가지지 않는다.
3. Plan은 Task 없이 존재할 수 있다.
4. Plan은 여러 Task를 연결할 수 있다.
5. Plan 화면에 체크 UI는 존재하지만, 체크 대상은 Plan이 아니라 PlanTask다.

## PlanTask 규칙

1. PlanTask는 Plan과 Task의 연결이다.
2. PlanTask는 체크 상태를 가진다.
3. PlanTask를 체크하면 해당 시간 슬롯에서 Task를 수행했다는 기록이 남는다.
4. PlanTask 체크가 원본 Task 완료로 이어지는지는 반복 여부와 완료 정책에 따른다.

## Plan에 Task 추가 규칙

1. Plan에 Leaf Task를 추가하면 해당 Task가 그대로 PlanTask가 된다.
2. Plan에 상위 Task를 추가하면 하위 Leaf Task들이 자동으로 펼쳐져 PlanTask가 된다.
3. Plan에서 Task를 검색할 때는 Plan 시간 범위와 Task 목표 기간이 겹치는 Task를 우선 노출한다.
4. 기간 없는 Task나 지향점은 필터로 포함할 수 있다.

## 반복 규칙

1. 반복은 사용자에게 Task의 성질처럼 보일 수 있다.
2. 내부적으로 반복은 RepeatRule 객체로 분리한다.
3. 반복 주기는 매일, 매주, 매월, 매년을 지원한다.
4. 반복 종료 조건은 없음, 특정 날짜까지, N회 반복을 지원한다.
5. 종료형 반복은 모든 회차가 완료되면 원본 Task도 done 처리될 수 있다.
6. 종료 조건 없는 습관형 반복은 원본 Task를 active 상태로 유지한다.

## 비용 규칙

1. MVP에서는 Plan에 예상 비용과 실제 비용을 둔다.
2. 비용은 Task가 아니라 이벤트성 실행 맥락인 Plan에 먼저 귀속한다.
3. 추후 장부 기능에서는 Expense 객체로 분리할 수 있다.

