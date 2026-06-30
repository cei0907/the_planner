# API 계약 문서

이 문서는 The Planner MVP의 REST API 계약을 정의한다.

## 공통 규칙

### Base URL

```text
/api
```

### 인증

MVP는 단일 사용자 로그인을 지원한다.

- 로그인 성공 시 access token을 발급한다.
- 모든 보호 API는 `Authorization: Bearer <token>` 헤더를 사용한다.
- 응답의 날짜/시간은 ISO 8601 문자열을 사용한다.

### 공통 에러 응답

```json
{
  "error": {
    "code": "TASK_MAX_DEPTH_EXCEEDED",
    "message": "Level5 Task cannot have child tasks."
  }
}
```

## Auth API

### POST /auth/login

로그인한다.

Request:

```json
{
  "email": "me@example.com",
  "password": "password"
}
```

Response:

```json
{
  "accessToken": "jwt-token",
  "user": {
    "id": "1",
    "email": "me@example.com",
    "displayName": "Me"
  }
}
```

### GET /auth/me

현재 로그인한 사용자를 조회한다.

Response:

```json
{
  "id": "1",
  "email": "me@example.com",
  "displayName": "Me"
}
```

## Task API

### GET /tasks

Task 목록을 조회한다.

Query:

- `parentId`: 특정 부모의 자식만 조회
- `type`: `task`, `project`, `aspiration`
- `status`: `todo`, `active`, `done`
- `from`: 목표 기간 검색 시작
- `to`: 목표 기간 검색 종료
- `includeNoTarget`: 기간 없는 Task 포함 여부

Response:

```json
{
  "items": [
    {
      "id": "10",
      "parentId": null,
      "type": "project",
      "title": "공무원 시험 준비",
      "description": null,
      "why": "안정적인 커리어 기반을 만들기 위해",
      "level": 1,
      "status": "active",
      "targetStartAt": "2026-07-01T00:00:00.000Z",
      "targetEndAt": "2026-12-31T23:59:59.999Z",
      "progress": {
        "leafTotalCount": 12,
        "leafDoneCount": 3,
        "progressRate": 0.25
      }
    }
  ]
}
```

### GET /tasks/tree

Task Tree를 조회한다.

Response:

```json
{
  "items": [
    {
      "id": "10",
      "title": "공무원 시험 준비",
      "type": "project",
      "level": 1,
      "status": "active",
      "progress": {
        "leafTotalCount": 12,
        "leafDoneCount": 3,
        "progressRate": 0.25
      },
      "children": []
    }
  ]
}
```

### POST /tasks

최상위 Task를 생성한다.

Request:

```json
{
  "type": "project",
  "title": "공무원 시험 준비",
  "description": null,
  "why": "안정적인 커리어 기반을 만들기 위해",
  "targetStartAt": "2026-07-01T00:00:00.000Z",
  "targetEndAt": "2026-12-31T23:59:59.999Z"
}
```

Response: `201 Created`

```json
{
  "id": "10",
  "parentId": null,
  "type": "project",
  "title": "공무원 시험 준비",
  "level": 1,
  "status": "todo"
}
```

### POST /tasks/:taskId/children

하위 Task를 생성한다.

Rules:

- 부모 Task가 Level5이면 실패한다.
- 생성되는 Task의 level은 부모 level + 1이다.

Request:

```json
{
  "type": "task",
  "title": "영어 공부",
  "description": null,
  "why": null,
  "targetStartAt": null,
  "targetEndAt": null
}
```

### PATCH /tasks/:taskId

Task를 수정한다.

Request:

```json
{
  "title": "영어 리스닝 공부",
  "description": "기초 강의와 쉐도잉 중심",
  "why": "시험 영어 듣기 점수를 올리기 위해",
  "targetStartAt": "2026-07-01T00:00:00.000Z",
  "targetEndAt": "2026-07-31T23:59:59.999Z"
}
```

### DELETE /tasks/:taskId

Task를 삭제한다.

MVP에서는 하위 Task가 있으면 함께 삭제할지 확인하는 UI가 필요하다. API는 subtree 삭제를 수행한다.

### POST /tasks/:taskId/complete

Task를 완료 처리한다.

Rules:

- 자기 자신과 모든 하위 Task가 done이 된다.
- 조상 Task들의 진행률이 갱신된다.

Response:

```json
{
  "completedTaskIds": ["10", "11", "12"],
  "updatedProgressTaskIds": ["10"]
}
```

### POST /tasks/:taskId/uncomplete

Task 완료를 해제한다.

Rules:

- 자기 자신만 todo가 된다.
- 하위 Task는 변경하지 않는다.
- 조상 Task들의 진행률이 갱신된다.

## Plan API

### GET /plans

특정 기간의 Plan을 조회한다.

Query:

- `from`: 조회 시작 일시
- `to`: 조회 종료 일시

Response:

```json
{
  "items": [
    {
      "id": "100",
      "title": "당일치기 여행 준비",
      "startAt": "2026-07-04T08:00:00.000Z",
      "endAt": "2026-07-04T22:00:00.000Z",
      "location": "서울역",
      "memo": "비 오면 우산 챙기기",
      "estimatedCost": "80000.00",
      "actualCost": null,
      "tasks": [],
      "supplies": []
    }
  ]
}
```

### POST /plans

Plan을 생성한다.

Request:

```json
{
  "title": "당일치기 여행 준비",
  "startAt": "2026-07-04T08:00:00.000Z",
  "endAt": "2026-07-04T22:00:00.000Z",
  "location": "서울역",
  "memo": "비 오면 우산 챙기기",
  "estimatedCost": "80000.00"
}
```

Rules:

- `endAt`은 `startAt`보다 늦어야 한다.
- Plan에는 완료 상태가 없다.

### GET /plans/:planId

Plan 상세를 조회한다.

Response:

```json
{
  "id": "100",
  "title": "당일치기 여행 준비",
  "startAt": "2026-07-04T08:00:00.000Z",
  "endAt": "2026-07-04T22:00:00.000Z",
  "location": "서울역",
  "memo": "비 오면 우산 챙기기",
  "estimatedCost": "80000.00",
  "actualCost": null,
  "tasks": [
    {
      "planTaskId": "1000",
      "taskId": "200",
      "title": "교통편 확인",
      "status": "todo",
      "completedAt": null
    }
  ],
  "supplies": [
    {
      "id": "500",
      "title": "신분증",
      "isChecked": false
    }
  ]
}
```

### PATCH /plans/:planId

Plan을 수정한다.

### DELETE /plans/:planId

Plan을 삭제한다.

Rules:

- 연결된 PlanTask와 PlanSupply도 함께 삭제한다.
- 원본 Task는 삭제하지 않는다.

## PlanTask API

### GET /plans/:planId/task-candidates

Plan 시간 범위에 적합한 Task 후보를 조회한다.

Query:

- `q`: 검색어
- `includeNoTarget`: 기간 없는 Task 포함 여부

Response:

```json
{
  "items": [
    {
      "id": "200",
      "title": "당일치기 여행",
      "type": "project",
      "level": 1,
      "isLeaf": false,
      "leafCount": 4,
      "targetStartAt": null,
      "targetEndAt": null
    }
  ]
}
```

### POST /plans/:planId/tasks

Plan에 Task를 연결한다.

Rules:

- Leaf Task를 추가하면 해당 Task가 PlanTask가 된다.
- 상위 Task를 추가하면 하위 Leaf Task들이 자동으로 펼쳐져 PlanTask가 된다.

Request:

```json
{
  "taskId": "200"
}
```

Response:

```json
{
  "items": [
    {
      "planTaskId": "1000",
      "taskId": "201",
      "title": "교통편 확인",
      "status": "todo"
    },
    {
      "planTaskId": "1001",
      "taskId": "202",
      "title": "예약 확인",
      "status": "todo"
    }
  ]
}
```

### POST /plan-tasks/:planTaskId/check

PlanTask를 완료 처리한다.

Rules:

- Plan 자체는 완료 처리하지 않는다.
- 반복 없는 일반 Task는 정책에 따라 원본 Task 완료에 반영할 수 있다.
- 종료형 반복 Task는 모든 회차가 완료되면 원본 Task를 done 처리한다.
- 습관형 반복 Task는 원본 Task를 active로 유지한다.

Response:

```json
{
  "planTask": {
    "id": "1000",
    "status": "done",
    "completedAt": "2026-07-04T09:00:00.000Z"
  },
  "taskStatusChanged": true
}
```

### POST /plan-tasks/:planTaskId/uncheck

PlanTask 완료를 해제한다.

Rules:

- PlanTask만 todo로 되돌린다.
- 원본 Task 완료 해제는 자동으로 수행하지 않는다.

### DELETE /plan-tasks/:planTaskId

Plan에서 Task 연결을 제거한다.

Rules:

- PlanTask만 삭제한다.
- 원본 Task는 삭제하지 않는다.

## PlanSupply API

### POST /plans/:planId/supplies

준비물을 추가한다.

Request:

```json
{
  "title": "신분증"
}
```

### PATCH /plan-supplies/:supplyId

준비물을 수정하거나 체크한다.

Request:

```json
{
  "title": "신분증",
  "isChecked": true
}
```

### DELETE /plan-supplies/:supplyId

준비물을 삭제한다.

## RepeatRule API

### POST /tasks/:taskId/repeat-rules

Task에 반복 규칙을 생성한다.

Request:

```json
{
  "frequency": "daily",
  "intervalValue": 1,
  "weekdays": null,
  "endType": "count",
  "endAt": null,
  "occurrenceCount": 30,
  "defaultStartTime": "07:00:00",
  "defaultEndTime": "07:30:00"
}
```

### GET /tasks/:taskId/repeat-rules

Task의 반복 규칙을 조회한다.

### PATCH /repeat-rules/:repeatRuleId

반복 규칙을 수정한다.

### DELETE /repeat-rules/:repeatRuleId

반복 규칙을 삭제한다.

## 상태 코드

- `200 OK`: 조회, 수정, 상태 변경 성공
- `201 Created`: 생성 성공
- `204 No Content`: 삭제 성공
- `400 Bad Request`: 잘못된 입력
- `401 Unauthorized`: 인증 실패
- `403 Forbidden`: 다른 사용자의 리소스 접근
- `404 Not Found`: 리소스 없음
- `409 Conflict`: 도메인 규칙 충돌

## 대표 에러 코드

- `AUTH_INVALID_CREDENTIALS`
- `TASK_NOT_FOUND`
- `TASK_MAX_DEPTH_EXCEEDED`
- `TASK_INVALID_PARENT`
- `PLAN_NOT_FOUND`
- `PLAN_INVALID_TIME_RANGE`
- `PLAN_TASK_NOT_FOUND`
- `REPEAT_RULE_INVALID_END_CONDITION`

