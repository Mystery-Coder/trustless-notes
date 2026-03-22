import { create } from "zustand"

export interface DecryptedNote {
  id: string
  title: string
  content_cipher: string
  content_iv: string
  noteKey: CryptoKey
  created_at: string
}

interface NotesStore {
  notes: DecryptedNote[]
  activeNoteId: string | null
  setNotes: (notes: DecryptedNote[]) => void
  addNote: (note: DecryptedNote) => void
  updateNote: (id: string, updates: Partial<DecryptedNote>) => void
  deleteNote: (id: string) => void
  setActiveNoteId: (id: string | null) => void
}

export const useNotesStore = create<NotesStore>((set) => ({
  notes: [],
  activeNoteId: null,
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),
  updateNote: (id, updates) => set((s) => ({
    notes: s.notes.map(n => n.id === id ? { ...n, ...updates } : n)
  })),
  deleteNote: (id) => set((s) => ({
    notes: s.notes.filter(n => n.id !== id),
    activeNoteId: s.activeNoteId === id ? (s.notes.filter(n => n.id !== id)[0]?.id ?? null) : s.activeNoteId
  })),
  setActiveNoteId: (id) => set({ activeNoteId: id })
}))
