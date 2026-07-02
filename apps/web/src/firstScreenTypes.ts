import type { PrimaryTab } from "./layout";

export type FirstScreenView = "designer" | "focus" | "scheduler";
export type ScheduleSegment = "day" | "week" | "month" | "year";

export interface PlannerTreeItem {
  id: string;
  parentId: string | null;
  title: string;
  level: number;
  type: "aspiration" | "project" | "task";
  collapsed: boolean;
}

export interface FirstScreenNavigationProps {
  onTabChange: (tab: PrimaryTab) => void;
}
