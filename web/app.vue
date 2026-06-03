<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b bg-white">
      <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <NuxtLink to="/" class="font-semibold text-lg text-brand-700">
          Postgrad Readiness
        </NuxtLink>
        <nav class="flex gap-4 text-sm text-slate-600 items-center">
          <NuxtLink
            to="/programs"
            class="hover:text-brand-700"
            active-class="text-brand-700 font-medium"
          >
            Programs
          </NuxtLink>
          <NuxtLink
            v-if="session.isAuthenticated"
            to="/my-programs"
            class="hover:text-brand-700"
            active-class="text-brand-700 font-medium"
          >
            My programs
          </NuxtLink>
          <template v-if="session.isAuthenticated">
            <span class="text-slate-500" data-testid="nav-name">
              {{ session.profileName }}
            </span>
            <button
              type="button"
              data-testid="logout"
              class="text-slate-600 hover:text-brand-700"
              @click="logout"
            >
              Log out
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="hover:text-brand-700"
              active-class="text-brand-700 font-medium"
            >
              Log in
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="bg-brand-600 text-white px-3 py-1.5 rounded hover:bg-brand-700"
            >
              Sign up
            </NuxtLink>
          </template>
        </nav>
      </div>
    </header>
    <main class="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useSessionStore } from "~/stores/session";
const session = useSessionStore();
const router = useRouter();
const api = useApi();

async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {
    // Token may already be invalid; clearing locally is what matters.
  }
  session.clear();
  await router.push("/login");
}
</script>
