# 구현 로드맵

## 0단계: 도메인 고정

산출물:

- 도메인 언어 문서
- 객체 모델 문서
- 객체 슈도코드
- 도메인 규칙 문서

완료 기준:

- Task와 Plan의 책임이 섞이지 않는다.
- Plan에 완료 상태가 없다는 원칙이 문서화되어 있다.
- PlanTask 체크와 Task 완료 정책이 분리되어 있다.

## 1단계: 프로젝트 스캐폴딩

목표:

- TypeScript 기반 모노레포 또는 단일 레포 구조 생성
- React + Vite 프론트엔드 생성
- Express 백엔드 생성
- shared domain 타입 패키지 생성

권장 구조:

```text
apps/
  web/
  api/
packages/
  shared/
docs/
```

## 2단계: 공통 도메인 타입

목표:

- `TaskType`
- `TaskStatus`
- `PlanTaskStatus`
- `RepeatFrequency`
- `RepeatEndType`
- 주요 DTO와 Entity 타입

완료 기준:

- 프론트와 백엔드가 같은 타입 언어를 사용한다.

## 3단계: DB 스키마

목표:

- MariaDB 기준 스키마 설계
- users, tasks, task_progress, plans, plan_tasks, plan_supplies, repeat_rules

완료 기준:

- 모든 핵심 테이블에 `user_id`가 있다.
- Task Tree를 표현할 수 있다.
- Plan은 `is_done`을 갖지 않는다.

## 4단계: Task API

목표:

- Task CRUD
- 하위 Task 생성
- 최대 5단계 제한
- Task Type 관리
- 완료 전파
- 진행률 갱신

완료 기준:

- 상위 Task 완료 시 하위 전체가 done이 된다.
- 완료 해제는 자기 자신만 미완료 처리한다.
- Leaf 기준 진행률이 갱신된다.

## 5단계: Plan API

목표:

- Plan CRUD
- PlanSupply CRUD
- Plan에 Task 연결
- 상위 Task 연결 시 Leaf 자동 펼침
- PlanTask 체크

완료 기준:

- Plan 자체에는 완료 상태가 없다.
- Plan 화면의 체크는 PlanTask 상태를 바꾼다.

## 6단계: 화면 구현

목표:

- 로그인 화면
- Task Tree 화면
- Task 상세 화면
- 일간 Plan 화면
- 월간 Plan 화면

완료 기준:

- 사용자는 Task를 만들고 Plan에 배치할 수 있다.
- 사용자는 Plan 화면에서 PlanTask를 체크할 수 있다.

## 7단계: 반복 구현

목표:

- RepeatRule CRUD
- 반복 PlanTask 또는 Occurrence 생성
- 종료형 반복 완료 처리
- 습관형 반복 active 유지

완료 기준:

- N회 반복이 모두 완료되면 원본 Task가 done 처리된다.
- 종료 조건 없는 반복은 원본 Task가 done으로 닫히지 않는다.

## 8단계: PWA와 배포 준비

목표:

- PWA manifest
- 기본 service worker
- 카페24 VPS 배포 문서
- 환경변수 문서

완료 기준:

- 휴대폰과 iPad 홈 화면에 설치할 수 있다.
- VPS 배포 절차가 문서화되어 있다.

