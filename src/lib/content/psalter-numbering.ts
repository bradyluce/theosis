import type { PsalterScheme } from "@theosis/core";

// LXX ↔ MT psalm mapping. Tables enumerate which MT psalms each LXX psalm
// covers (and the inverse) so commentary tagged in one scheme can be shown
// to a reader using the other.

const LXX_TO_MT: Record<number, number[]> = {
  9: [9, 10],
  113: [114, 115],
  114: [116],
  115: [116],
  146: [147],
  147: [147],
};

const MT_TO_LXX: Record<number, number[]> = {
  9: [9],
  10: [9],
  114: [113],
  115: [113],
  116: [114, 115],
  147: [146, 147],
};

// Returns the MT psalm numbers that an LXX psalm covers.
// For psalms outside the explicit table, LXX 10-112 = MT 11-113 and
// LXX 116-145 = MT 117-146 (shift +1); identity elsewhere.
export function lxxToMt(lxx: number): number[] {
  const explicit = LXX_TO_MT[lxx];
  if (explicit) return explicit;
  if (lxx >= 10 && lxx <= 112) return [lxx + 1];
  if (lxx >= 116 && lxx <= 145) return [lxx + 1];
  return [lxx];
}

// Returns the LXX psalm numbers that an MT psalm maps to.
// For psalms outside the explicit table, MT 11-113 = LXX 10-112 and
// MT 117-146 = LXX 116-145 (shift -1); identity elsewhere.
export function mtToLxx(mt: number): number[] {
  const explicit = MT_TO_LXX[mt];
  if (explicit) return explicit;
  if (mt >= 11 && mt <= 113) return [mt - 1];
  if (mt >= 117 && mt <= 146) return [mt - 1];
  return [mt];
}

// Given a chapter number in the reader's scheme, return the chapter numbers
// in the entry's scheme that should match. Used by the commentary loader to
// surface psalter commentary across LXX/MT translations.
//
// If either scheme is undefined (NT-only translation, or untagged entry),
// treat as identity — the caller should match the chapter number directly.
export function toEntryChapterNumbers(
  readerChapter: number,
  readerScheme: PsalterScheme | undefined,
  entryScheme: PsalterScheme | undefined,
): number[] {
  if (!readerScheme || !entryScheme || readerScheme === entryScheme) {
    return [readerChapter];
  }
  if (readerScheme === "MT" && entryScheme === "LXX") {
    return mtToLxx(readerChapter);
  }
  if (readerScheme === "LXX" && entryScheme === "MT") {
    return lxxToMt(readerChapter);
  }
  return [readerChapter];
}
