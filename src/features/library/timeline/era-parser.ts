// Era parser has moved to @theosis/core so the mobile app can use it.
// This file remains as a thin re-export so the existing web timeline
// page (src/app/(shell)/library/timeline/page.tsx) keeps working without
// churn.

export {
  parseEra,
  centuryFromYear,
  centuryLabel,
  type EraResult,
} from "@theosis/core";
