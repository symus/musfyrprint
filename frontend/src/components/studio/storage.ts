/**
 * Design drafts are owned by an edit token until customer accounts exist. Tokens stay on this device only.
 */
export interface SavedDraft {
  id: string;
  token: string;
  productSlug: string;
  name: string | null;
  savedAt: string;
}

const KEY = "musfir.designs";

export function listDrafts(): SavedDraft[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedDraft[]) : [];
  } catch {
    return [];
  }
}

export function rememberDraft(draft: SavedDraft) {
  try {
    const others = listDrafts().filter((d) => d.id !== draft.id);
    localStorage.setItem(KEY, JSON.stringify([draft, ...others].slice(0, 50)));
  } catch {
    // storage unavailable: the draft is saved on the server but this device won't remember it
  }
}

export const findDraft = (id: string) => listDrafts().find((d) => d.id === id) ?? null;
