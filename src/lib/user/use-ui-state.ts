import { create } from "zustand";

// Lightweight, non-persisted UI flags used to coordinate cross-component
// visibility. Currently: the verse action sheet in the Bible reader sets
// `verseSheetOpen` so the global BottomNav can slide out of view while the
// commentary sheet is being read.
type UiState = {
  verseSheetOpen: boolean;
  setVerseSheetOpen: (open: boolean) => void;
};

export const useUiState = create<UiState>((set) => ({
  verseSheetOpen: false,
  setVerseSheetOpen: (open) => set({ verseSheetOpen: open }),
}));
