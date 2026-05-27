// Reading-plan types have moved to @theosis/core. This file is a thin
// re-export for backwards compatibility — existing imports of
// "@/domain/reading-plans/types" continue to resolve.

export type {
  ReadingPlan,
  ReadingPlanCategory,
  ReadingPlanDay,
  ReadingPlanProgress,
  ReadingPlanReading,
} from "@theosis/core";
