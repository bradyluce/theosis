// Reading plan corpus has moved to @theosis/core so the mobile app can
// import the same data. This file remains as a thin re-export so existing
// web call sites (the /reading-plans pages, home tile) keep working
// without churn.

export {
  readingPlans,
  getReadingPlanById,
  getReadingPlanBySlug,
} from "@theosis/core";
