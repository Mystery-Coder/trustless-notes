import { create } from "zustand";

interface SessionStore {
	username: string | null;
	derivedKey: CryptoKey | null;
	setSession: (username: string, key: CryptoKey) => void;
	clearSession: () => void;
}

/**
 * In-memory session store.
 * No persist middleware — clears on page refresh by design.
 * CryptoKey is always non-extractable (enforced at creation site).
 */
export const useSessionStore = create<SessionStore>((set) => ({
	username: null,
	derivedKey: null,
	setSession: (username, key) => set({ username, derivedKey: key }),
	clearSession: () => set({ username: null, derivedKey: null }),
}));
