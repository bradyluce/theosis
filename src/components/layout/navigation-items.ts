import {
  BookOpenText,
  MagnifyingGlass,
  Scroll,
  SunDim,
  UserCircle,
} from "@phosphor-icons/react";

export const navigationItems = [
  {
    href: "/daily",
    label: "Daily",
    description: "Commemorations, readings, and the shape of the day.",
    Icon: SunDim,
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
    description: "Fathers, saints, works, and related Orthodox writings.",
    Icon: Scroll,
  },
  {
    href: "/search",
    label: "Search",
    description: "Verse intent, fuzzy names, and blended results.",
    Icon: MagnifyingGlass,
  },
  {
    href: "/profile",
    label: "Profile",
    description: "Saved study, notes, history, and preferences.",
    Icon: UserCircle,
  },
] as const;
