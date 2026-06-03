import { useSessionStore } from "~/stores/session";

export default defineNuxtPlugin(() => {
  // Pinia state from SSR is empty on the client because localStorage isn't
  // available server-side. Hydrate from localStorage as the app starts so
  // protected routes can see the user as authenticated on reload.
  const session = useSessionStore();
  session.hydrateFromStorage();
});
