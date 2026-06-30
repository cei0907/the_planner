# 도메인 언어

이 문서는 The Planner에서 사용하는 개념 언어를 고정한다.

## Task

Task는 "무엇을 할 것인가"와 "왜 하는가"를 담는 의미 단위다.

Task는 다음 성격을 가진다.

- 계층 구조를 가진다.
- 최대 5단계까지 중첩될 수 있다.
- 완료 상태를 가진다.
- 목표 기간을 가질 수 있다.
- Plan에 연결될 수 있다.

## Task Type

### 할 일

내부 값: `task`

가장 일반적인 실행 항목이다. 단독 Leaf Task가 될 수도 있고, Project나 Aspiration 아래에 속할 수도 있다.

### 프로젝트

내부 값: `project`

여러 Task를 묶는 목표 단위다. 추후 팀 단위 운영의 기반이 될 수 있다.

### 지향점

내부 값: `aspiration`

아직 실행 구조나 기간이 명확하지 않지만 삶의 방향성과 욕망을 담은 목표다.

예:

- 경제적으로 자유로워지기
- 유럽에서 한 달 살아보기
- 좋은 개발자로 성장하기

## Plan

Plan은 "언제, 어디서, 어떤 맥락으로 실행할 것인가"를 담는 시간 슬롯이다.

Plan은 다음 성격을 가진다.

- 시작 일시와 종료 일시를 가진다.
- 장소를 가질 수 있다.
- 준비물 체크리스트를 가질 수 있다.
- 메모를 가질 수 있다.
- 비용을 가질 수 있다.
- Task 없이도 존재할 수 있다.
- 여러 Task를 연결할 수 있다.
- 완료 상태는 가지지 않는다.

## PlanTask

PlanTask는 Plan 안에서 실행할 Task를 뜻한다.

사용자가 Plan 화면에서 누르는 체크박스의 실제 대상은 PlanTask다.

## Leaf Task

Leaf Task는 하위 Task가 없는 Task다.

- Level1 Task도 하위가 없으면 Leaf Task다.
- Level5 Task는 항상 Leaf Task다.
- 실제 실행과 체크의 기본 단위다.

## RepeatRule

RepeatRule은 반복 배치 규칙이다.

사용자에게는 "반복 Task"처럼 보일 수 있지만, 내부적으로는 Task와 RepeatRule을 분리한다.

## Progress

Progress는 Task Tree의 진행률이다.

기본 계산식:

```text
완료된 Leaf Task 수 / 전체 Leaf Task 수
```

