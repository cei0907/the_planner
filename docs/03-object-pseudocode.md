# 객체 슈도코드

이 문서는 실제 구현 전에 객체의 책임과 메서드를 슈도코드로 고정한다.

## Task

```ts
class Task {
  id: TaskId
  userId: UserId
  parentId: TaskId | null
  type: TaskType
  title: string
  description: string | null
  why: string | null
  level: number
  status: TaskStatus
  targetStartAt: DateTime | null
  targetEndAt: DateTime | null

  canHaveChild(): boolean {
    return this.level < 5
  }

  assertCanAddChild(): void {
    if (!this.canHaveChild()) {
      throw new DomainError("Level5 Task cannot have child tasks.")
    }
  }

  isLeaf(childrenCount: number): boolean {
    return childrenCount === 0
  }

  markDone(): void {
    this.status = "done"
  }

  markUndone(): void {
    this.status = "todo"
  }

  isWithinTargetRange(startAt: DateTime, endAt: DateTime): boolean {
    if (!this.targetStartAt || !this.targetEndAt) {
      return false
    }

    return rangesOverlap(this.targetStartAt, this.targetEndAt, startAt, endAt)
  }
}
```

## TaskTreeService

```ts
class TaskTreeService {
  createChild(parent: Task, input: CreateTaskInput): Task {
    parent.assertCanAddChild()

    return new Task({
      parentId: parent.id,
      level: parent.level + 1,
      ...input
    })
  }

  completeSubtree(taskId: TaskId): void {
    const subtree = taskRepository.findDescendantsIncludingSelf(taskId)

    for (const task of subtree) {
      task.markDone()
      taskRepository.save(task)
    }

    const ancestors = taskRepository.findAncestors(taskId)
    progressService.recalculateFor(ancestors)
  }

  uncompleteSelfOnly(taskId: TaskId): void {
    const task = taskRepository.findById(taskId)
    task.markUndone()
    taskRepository.save(task)

    const ancestors = taskRepository.findAncestors(taskId)
    progressService.recalculateFor([task, ...ancestors])
  }

  expandToLeafTasks(taskId: TaskId): Task[] {
    const descendants = taskRepository.findDescendants(taskId)
    const leafTasks = descendants.filter(task => {
      const childCount = taskRepository.countChildren(task.id)
      return task.isLeaf(childCount)
    })

    if (leafTasks.length === 0) {
      return [taskRepository.findById(taskId)]
    }

    return leafTasks
  }
}
```

## TaskProgressService

```ts
class TaskProgressService {
  recalculateFor(tasks: Task[]): void {
    for (const task of tasks) {
      const leafTasks = taskRepository.findLeafDescendantsIncludingSelf(task.id)
      const leafTotalCount = leafTasks.length
      const leafDoneCount = leafTasks.filter(task => task.status === "done").length
      const progressRate = leafTotalCount === 0 ? 0 : leafDoneCount / leafTotalCount

      progressRepository.upsert({
        taskId: task.id,
        leafTotalCount,
        leafDoneCount,
        progressRate
      })
    }
  }

  updateAfterLeafStatusChanged(leafTaskId: TaskId): void {
    const leafTask = taskRepository.findById(leafTaskId)
    const ancestors = taskRepository.findAncestors(leafTaskId)
    this.recalculateFor([leafTask, ...ancestors])
  }
}
```

## Plan

```ts
class Plan {
  id: PlanId
  userId: UserId
  title: string
  startAt: DateTime
  endAt: DateTime
  location: string | null
  memo: string | null
  estimatedCost: Money | null
  actualCost: Money | null

  validateTimeRange(): void {
    if (this.endAt <= this.startAt) {
      throw new DomainError("Plan endAt must be after startAt.")
    }
  }

  overlapsTaskTarget(task: Task): boolean {
    return task.isWithinTargetRange(this.startAt, this.endAt)
  }
}
```

## PlanTaskService

```ts
class PlanTaskService {
  addTaskToPlan(planId: PlanId, taskId: TaskId): PlanTask[] {
    const plan = planRepository.findById(planId)
    const leafTasks = taskTreeService.expandToLeafTasks(taskId)

    return leafTasks.map(task => {
      return planTaskRepository.create({
        planId: plan.id,
        taskId: task.id,
        status: "todo"
      })
    })
  }

  checkPlanTask(planTaskId: PlanTaskId): void {
    const planTask = planTaskRepository.findById(planTaskId)
    planTask.status = "done"
    planTask.completedAt = now()
    planTaskRepository.save(planTask)

    taskCompletionPolicy.applyAfterPlanTaskChecked(planTask)
  }

  uncheckPlanTask(planTaskId: PlanTaskId): void {
    const planTask = planTaskRepository.findById(planTaskId)
    planTask.status = "todo"
    planTask.completedAt = null
    planTaskRepository.save(planTask)
  }
}
```

## TaskCompletionPolicy

```ts
class TaskCompletionPolicy {
  applyAfterPlanTaskChecked(planTask: PlanTask): void {
    const task = taskRepository.findById(planTask.taskId)

    if (repeatService.isEndlessHabitTask(task.id)) {
      return
    }

    if (repeatService.isFiniteRepeatTask(task.id)) {
      if (repeatService.areAllOccurrencesDone(task.id)) {
        taskTreeService.completeSubtree(task.id)
      }
      return
    }

    task.markDone()
    taskRepository.save(task)
    progressService.updateAfterLeafStatusChanged(task.id)
  }
}
```

## RepeatRule

```ts
class RepeatRule {
  id: RepeatRuleId
  taskId: TaskId
  frequency: RepeatFrequency
  intervalValue: number
  weekdays: Weekday[]
  endType: RepeatEndType
  endAt: DateTime | null
  occurrenceCount: number | null

  isFinite(): boolean {
    return this.endType === "until_date" || this.endType === "count"
  }

  isEndless(): boolean {
    return this.endType === "never"
  }
}
```

