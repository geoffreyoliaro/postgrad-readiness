<template>
  <section class="max-w-md mx-auto">
    <h1 class="text-2xl font-semibold mb-2">Log in</h1>
    <p class="text-slate-600 mb-6">
      New here?
      <NuxtLink to="/register" class="text-brand-700 hover:underline">
        Create an account
      </NuxtLink>
      .
    </p>

    <form
      class="space-y-4 bg-white p-6 rounded-lg border shadow-sm"
      data-testid="login-form"
      @submit.prevent="onSubmit"
    >
      <div>
        <label class="block text-sm font-medium mb-1">Email</label>
        <input
          v-model="email"
          type="email"
          required
          data-testid="login-email"
          class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Password</label>
        <input
          v-model="password"
          type="password"
          required
          data-testid="login-password"
          class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>
      <button
        type="submit"
        :disabled="submitting"
        data-testid="login-submit"
        class="w-full bg-brand-600 text-white font-medium py-2 rounded hover:bg-brand-700 disabled:opacity-50"
      >
        {{ submitting ? "Signing in…" : "Log in" }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useSessionStore } from "~/stores/session";
import type { ApiError, AuthResponse } from "~/types/api";

const session = useSessionStore();
const router = useRouter();
const route = useRoute();
const api = useApi();

const email = ref("");
const password = ref("");
const error = ref<string | null>(null);
const submitting = ref(false);

async function onSubmit() {
  error.value = null;
  submitting.value = true;
  try {
    const res = await api.post<AuthResponse>("/auth/login", {
      email: email.value,
      password: password.value,
    });
    session.setAuth(res.profile.id, res.profile.name, res.token);
    const nextRaw = route.query.next;
    const next = typeof nextRaw === "string" ? nextRaw : "/my-programs";
    await router.push(next);
  } catch (err: unknown) {
    const fetchErr = err as { data?: ApiError };
    error.value =
      fetchErr.data?.error?.message ?? "Email or password is incorrect.";
  } finally {
    submitting.value = false;
  }
}
</script>
