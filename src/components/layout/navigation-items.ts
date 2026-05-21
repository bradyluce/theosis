import {
  BookOpenText,
  Compass,
  House,
  Scroll,
  UserCircle,
} from "@phosphor-icons/react";

export const navigationItems = [
  {
    href: "/home",
    label: "Home",
    description: "Verse of the day, today's reading, and devotionals.",
    Icon: House,
  },
  {
    href: "/bible",
    label: "Bible",
    description: "Scripture reading with verse-level commentary access.",
    Icon: BookOpenText,
  },
  {
    href: "/library",
    label: "Library",
    description: "Fathers, saints, works, and Orthodox study collections.",
    Icon: Scroll,
  },
  {
    href: "/discover",
    label: "Discover",
    description: "Search, topics, and featured commentary.",
    Icon: Compass,
  },
  {
    href: "/you",
    label: "You",
    description: "Profile, saved study, streak, and preferences.",
    Icon: UserCircle,
  },
] as const;
