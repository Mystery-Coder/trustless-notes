import { create } from "zustand"

export interface DecryptedAttachment {
  name: string
  mimeType: string
  blobUrl: string  // created from base64 after decryption, lives in memory only
}

export interface DecryptedNote {
  id: string
  title: string
  content_cipher: string
  content_iv: string
  noteKey: CryptoKey
  created_at: string
  attachments_cipher: string | null   // raw ciphertext from DB
  attachments_iv: string | null       // raw iv from DB
  attachments: DecryptedAttachment[]  // decrypted, ready to render
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
