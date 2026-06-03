<template>
  <section>
    <NuxtLink
      to="/programs"
      class="text-sm text-slate-500 hover:text-slate-700"
    >
      ← Back to programs
    </NuxtLink>

    <div v-if="pending" class="mt-6 text-slate-500">Loading…</div>
    <div v-else-if="error || !data" class="mt-6 text-red-600">
      Failed to load program.
    </div>
    <div v-else class="mt-4">
      <h1 class="text-2xl font-semibold">{{ data.name }}</h1>
      <p class="text-slate-600 mt-1">
        {{ data.degreeType }} · application deadline
        {{ formatDate(data.applicationDeadline) }}
      </p>

      <div class="mt-6 bg-white border rounded-lg p-6">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
          <h2 class="font-medium">
            Requirements ({{ data.requirements.length }})
          </h2>
          <span
            v-if="isProgramComplete"
            class="text-sm font-medium text-blue-600"
            data-testid="program-requirements-completed"
          >
            Completed
          </span>
        </div>
        <ul class="divide-y">
          <li
            v-for="req in data.requirements"
            :key="req.id"
            class="py-3 flex items-start justify-between gap-4"
          >
            <div>
              <div class="font-medium">
                {{ req.title }}
                <span v-if="!req.required" class="text-xs text-slate-500 ml-2">
                  optional
                </span>
              </div>
              <div class="text-sm text-slate-600">{{ req.description }}</div>
            </div>
            <div class="text-sm text-slate-500 shrink-0">
              due {{ formatDate(dueDate(req.dueOffsetDays)) }}
            </div>
          </li>
        </ul>
      </div>

      <div v-if="!session.isAuthenticated" class="mt-6 text-sm text-slate-500">
        <NuxtLink
          :to="`/login?next=${encodeURIComponent($route.fullPath)}`"
          class="text-brand-700 hover:underline"
        >
          Log in
        </NuxtLink>
        or
        <NuxtLink to="/register" class="text-brand-700 hover:underline">
          create an account
        </NuxtLink>
        to start your checklist.
      </div>
      <button
        v-else
        :disabled="starting"
        data-testid="start-checklist"
        class="mt-6 bg-brand-600 text-white font-medium px-4 py-2 rounded hover:bg-brand-700 disabled:opacity-50"
        @click="startChecklist"
      >
        {{ starting ? "Starting…" : "Start checklist" }}
      </button>
      <div v-if="startError" class="mt-2 text-sm text-red-600">
        {{ startError }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useSessionStore } from "~/stores/session";
import type {
  ApiError,
  ChecklistResponse,
  ProfileProgramSummary,
  ProgramWithRequirements,
} from "~/types/api";
import { isProgramSummaryComplete } from "~/utils/programCompletion";

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const api = useApi();

const programId = computed(() => String(route.params.id));

const { data, pending, error } = await useAsyncData<ProgramWithRequirements>(
  `program-${programId.value}`,
  () => api.get<ProgramWithRequirements>(`/programs/${programId.value}`)
);

const { data: programSummary } = await useAsyncData<ProfileProgramSummary | null>(
  computed(
    () => `program-summary-${session.profileId ?? "none"}-${programId.value}`
  ),
  async () => {
    if (!session.profileId) {
      return null;
    }
    try {
      const summaries = await api.get<ProfileProgramSummary[]>(
        `/profiles/${session.profileId}/program-summaries`
      );
      if (!Array.isArray(summaries)) {
        return null;
      }
      return (
        summaries.find((s) => s?.programId === programId.value) ?? null
      );
    } catch {
      return null;
    }
  },
  { watch: [() => session.profileId, programId], default: () => null }
);

const isProgramComplete = computed(() =>
  isProgramSummaryComplete(programSummary.value)
);

const starting = ref(false);
const startError = ref<string | null>(null);

const MS_PER_DAY = 86_400_000;
function dueDate(offset: number): string {
  if (!data.value) {
    return "";
  }
  const deadline = new Date(`${data.value.applicationDeadline}T00:00:00Z`);
  return new Date(deadline.getTime() - offset * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

function formatDate(iso: string): string {
  if (iso.length === 0) {
    return "";
  }
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

async function startChecklist() {
  if (!session.profileId) {
    return;
  }
  startError.value = null;
  starting.value = true;
  try {
    await api.post<ChecklistResponse>(
      `/profiles/${session.profileId}/checklists`,
      { programId: programId.value }
    );
    session.setLastProgram(programId.value);
    await router.push(
      `/dashboard/${session.profileId}/${programId.value}`
    );
  } catch (err: unknown) {
    const fetchErr = err as { data?: ApiError };
    startError.value =
      fetchErr.data?.error?.message ?? "Could not start checklist.";
  } finally {
    starting.value = false;
  }
}
</script>
