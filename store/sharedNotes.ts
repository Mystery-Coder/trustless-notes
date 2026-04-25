import { create } from "zustand";

export interface SharedDecryptedNote {
  shareId: string;
  noteId: string;
  title: string;
  content_cipher: string;
  content_iv: string;
  noteKey: CryptoKey;
  senderUsername: string;
  sharedAt: string;
  createdAt: string;
}

interface SharedNotesStore {
  sharedNotes: SharedDecryptedNote[];
  activeSharedNoteId: string | null;
  setSharedNotes: (notes: SharedDecryptedNote[]) => void;
  addSharedNote: (note: SharedDecryptedNote) => void;
  setActiveSharedNoteId: (id: string | null) => void;
  clearSharedNotes: () => void;
}

export const useSharedNotesStore = create<SharedNotesStore>((set) => ({
  sharedNotes: [],
  activeSharedNoteId: null,
  setSharedNotes: (sharedNotes) => set({ sharedNotes }),
  addSharedNote: (note) => set((s) => ({ sharedNotes: [note, ...s.sharedNotes] })),
  setActiveSharedNoteId: (id) => set({ activeSharedNoteId: id }),
  clearSharedNotes: () => set({ sharedNotes: [], activeSharedNoteId: null }),
}));