import { useSessionStore } from "~/stores/session";

const PUBLIC_PATHS = ["/login", "/register"];

export default defineNuxtRouteMiddleware((to) => {
  // Only enforce on the client; localStorage isn't available during SSR
  // and we don't want SSR redirects to fight hydration.
  if (import.meta.server) {
    return;
  }
  const session = useSessionStore();

  if (PUBLIC_PATHS.includes(to.path)) {
    if (session.isAuthenticated) {
      return navigateTo("/my-programs");
    }
    return;
  }

  // The marketing-ish "/" plus the open program catalog stay public for
  // unauthenticated visitors; everything else requires a session.
  const openRoutes = to.path === "/" || to.path.startsWith("/programs");
  if (!openRoutes && !session.isAuthenticated) {
    return navigateTo(`/login?next=${encodeURIComponent(to.fullPath)}`);
  }
});
