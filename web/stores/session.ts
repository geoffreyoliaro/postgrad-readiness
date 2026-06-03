import { defineStore } from "pinia";

interface SessionState {
  profileId: string | null;
  profileName: string | null;
  token: string | null;
  lastProgramId: string | null;
}

const STORAGE_KEY = "postgrad-eval-session";

/** Client-side session persisted in localStorage (see plugins/session-hydrate.client.ts). */
function empty(): SessionState {
  return {
    profileId: null,
    profileName: null,
    token: null,
    lastProgramId: null,
  };
}

export const useSessionStore = defineStore("session", {
  state: (): SessionState => empty(),
  getters: {
    isAuthenticated(state): boolean {
      return state.token !== null && state.profileId !== null;
    },
  },
  actions: {
    hydrateFromStorage() {
      if (typeof window === "undefined") {
        return;
      }
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        return;
      }
      try {
        const parsed = JSON.parse(raw) as Partial<SessionState>;
        this.profileId = parsed.profileId ?? null;
        this.profileName = parsed.profileName ?? null;
        this.token = parsed.token ?? null;
        this.lastProgramId = parsed.lastProgramId ?? null;
      } catch {
        // ignore malformed stored state
      }
    },
    setAuth(profileId: string, profileName: string, token: string) {
      this.profileId = profileId;
      this.profileName = profileName;
      this.token = token;
      this.persist();
    },
    setLastProgram(programId: string) {
      this.lastProgramId = programId;
      this.persist();
    },
    clear() {
      this.profileId = null;
      this.profileName = null;
      this.token = null;
      this.lastProgramId = null;
      this.persist();
    },
    persist() {
      if (typeof window === "undefined") {
        return;
      }
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          profileId: this.profileId,
          profileName: this.profileName,
          token: this.token,
          lastProgramId: this.lastProgramId,
        })
      );
    },
  },
});
