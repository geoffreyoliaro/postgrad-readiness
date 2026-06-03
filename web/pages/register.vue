<template>
  <section class="max-w-xl mx-auto">
    <h1 class="text-2xl font-semibold mb-2">Create your account</h1>
    <p class="text-slate-600 mb-6">
      Already registered?
      <NuxtLink to="/login" class="text-brand-700 hover:underline">Log in</NuxtLink>
      instead.
    </p>

    <form
      class="space-y-4 bg-white p-6 rounded-lg border shadow-sm"
      data-testid="register-form"
      @submit.prevent="onSubmit"
    >
      <div>
        <label class="block text-sm font-medium mb-1">Name</label>
        <input
          v-model="form.name"
          type="text"
          required
          data-testid="register-name"
          class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Email</label>
        <input
          v-model="form.email"
          type="email"
          required
          data-testid="register-email"
          class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Password</label>
        <input
          v-model="form.password"
          type="password"
          required
          minlength="8"
          data-testid="register-password"
          class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p class="text-xs text-slate-500 mt-1">At least 8 characters.</p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Education level</label>
          <select
            v-model="form.educationLevel"
            data-testid="register-education"
            class="w-full border rounded px-3 py-2"
          >
            <option value="HIGH_SCHOOL">High school</option>
            <option value="ASSOCIATE">Associate</option>
            <option value="BACHELOR">Bachelor's</option>
            <option value="MASTER">Master's</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Target term</label>
          <input
            v-model="form.targetTerm"
            type="text"
            placeholder="Fall 2027"
            required
            data-testid="register-term"
            class="w-full border rounded px-3 py-2"
          />
          <p v-if="termError" class="text-xs text-red-600 mt-1">
            Format like "Fall 2027"
          </p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">GPA (optional)</label>
          <input
            v-model.number="form.gpa"
            type="number"
            min="0"
            max="4.5"
            step="0.01"
            class="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">
            Test score (optional)
          </label>
          <div class="flex gap-2">
            <input
              v-model="form.testName"
              type="text"
              placeholder="SAT"
              class="w-20 border rounded px-3 py-2"
            />
            <input
              v-model.number="form.testValue"
              type="number"
              placeholder="1450"
              class="flex-1 border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>

      <button
        type="submit"
        :disabled="submitting"
        data-testid="register-submit"
        class="w-full bg-brand-600 text-white font-medium py-2 rounded hover:bg-brand-700 disabled:opacity-50"
      >
        {{ submitting ? "Creating…" : "Create account" }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from "vue";
import { useSessionStore } from "~/stores/session";
import type { AuthResponse, ApiError, EducationLevel } from "~/types/api";

const session = useSessionStore();
const router = useRouter();
const api = useApi();

interface FormState {
  name: string;
  email: string;
  password: string;
  educationLevel: EducationLevel;
  targetTerm: string;
  gpa: number | null;
  testName: string;
  testValue: number | null;
}

const form = reactive<FormState>({
  name: "",
  email: "",
  password: "",
  educationLevel: "BACHELOR",
  targetTerm: "Fall 2027",
  gpa: null,
  testName: "",
  testValue: null,
});

const error = ref<string | null>(null);
const submitting = ref(false);
const termError = computed(
  () => !/^(Fall|Spring|Summer|Winter) \d{4}$/.test(form.targetTerm)
);

async function onSubmit() {
  error.value = null;
  if (termError.value) {
    error.value = "Target term must look like 'Fall 2027'";
    return;
  }
  submitting.value = true;
  const testScores =
    form.testName.length > 0 && form.testValue !== null
      ? { [form.testName]: form.testValue }
      : null;
  try {
    const res = await api.post<AuthResponse>("/auth/register", {
      name: form.name,
      email: form.email,
      password: form.password,
      educationLevel: form.educationLevel,
      gpa: form.gpa,
      testScores,
      targetTerm: form.targetTerm,
    });
    session.setAuth(res.profile.id, res.profile.name, res.token);
    await router.push("/programs");
  } catch (err: unknown) {
    const fetchErr = err as { data?: ApiError };
    error.value =
      fetchErr.data?.error?.message ?? "Could not create account. Try again.";
  } finally {
    submitting.value = false;
  }
}
</script>
