import { useSessionStore } from "~/stores/session";

export function useApi() {
  const config = useRuntimeConfig();
  const base = config.public.apiBase;

  async function request<T>(
    path: string,
    opts: {
      method?: string;
      body?: unknown;
      query?: Record<string, unknown>;
    } = {}
  ): Promise<T> {
    const session = useSessionStore();
    const headers: Record<string, string> = {};
    if (session.token !== null) {
      headers.Authorization = `Bearer ${session.token}`;
    }
    return await $fetch<T>(`${base}${path}`, {
      method: (opts.method ?? "GET") as "GET" | "POST" | "PATCH" | "DELETE",
      body: opts.body,
      query: opts.query,
      headers,
      onResponseError({ response }) {
        if (response.status === 401) {
          // Token expired or revoked — clear so the route guard redirects to login.
          session.clear();
        }
      },
    });
  }

  return {
    get: <T>(path: string, query?: Record<string, unknown>) =>
      request<T>(path, { query }),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "POST", body }),
    patch: <T>(path: string, body: unknown) =>
      request<T>(path, { method: "PATCH", body }),
  };
}
