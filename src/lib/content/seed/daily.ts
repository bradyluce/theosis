import type { DailyCommemoration, HymnText, ReadingAssignment } from "@/domain/content/types";
import { createReference } from "@/lib/content/reference";

export const readingAssignments: ReadingAssignment[] = [
  {
    id: "reading-daily-john",
    label: "Gospel",
    contextLabel: "Daily Office",
    scripture: createReference("john", "John", 1, 1, 5),
  },
  {
    id: "reading-daily-second-peter",
    label: "Epistle",
    contextLabel: "Daily Office",
    scripture: createReference("second-peter", "2 Peter", 1, 2, 8),
  },
  {
    id: "reading-daily-wisdom",
    label: "Wisdom",
    contextLabel: "Commemoration",
    scripture: createReference("wisdom", "Wisdom of Solomon", 7, 25, 27),
  },
];

export const hymnTexts: HymnText[] = [
  {
    id: "troparion-forty-martyrs",
    type: "troparion",
    title: "Troparion of the Forty Martyrs",
    tone: "Tone 1",
    text:
      "Through the sufferings which Thy holy Forty Martyrs endured for Thy sake, O Lord, we beseech Thee, O Lover of mankind: heal all our infirmities.",
    sourceId: "source-oca-daily",
  },
  {
    id: "kontakion-forty-martyrs",
    type: "kontakion",
    title: "Kontakion of the Forty Martyrs",
    tone: "Tone 6",
    text:
      "You forsook all earthly armies and cleaved to the Master in heaven, O Forty Martyrs of the Lord; passing through fire and water, you received glory and crowns from heaven.",
    sourceId: "source-oca-daily",
  },
];

export const dailyCommemorations: DailyCommemoration[] = [
  {
    id: "daily-2026-03-09",
    isoDate: "2026-03-09",
    title: "The Holy Forty Martyrs of Sebaste",
    summary:
      "A Lenten commemoration marked by endurance, brotherhood, and the radiant steadiness of confession under trial.",
    saintIds: ["forty-martyrs-of-sebaste"],
    feastLabel: "Commemoration of the Forty Martyrs",
    fastLabel: "Great Lent",
    readingIds: [
      "reading-daily-john",
      "reading-daily-second-peter",
      "reading-daily-wisdom",
    ],
    hymnIds: ["troparion-forty-martyrs", "kontakion-forty-martyrs"],
    lifeExcerpt:
      "The Forty endured the freezing lake together, strengthening one another in confession until their witness became a single hymn of perseverance. Their memory gives the Daily page a devotional center that is sober rather than sentimental.",
    sourceId: "source-oca-daily",
  },
];
