<template>
  <section>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Programs</h1>
      <NuxtLink
        v-if="!session.isAuthenticated"
        to="/register"
        class="text-sm text-brand-700 hover:underline"
      >
        Create an account →
      </NuxtLink>
    </div>

    <div class="flex gap-3 mb-6">
      <select
        v-model="degreeType"
        data-testid="filter-degree"
        class="border rounded px-3 py-2 bg-white"
      >
        <option value="">All degrees</option>
        <option value="BA">BA</option>
        <option value="BS">BS</option>
        <option value="MA">MA</option>
        <option value="MS">MS</option>
        <option value="PHD">PhD</option>
      </select>
      <input
        v-model="q"
        type="search"
        placeholder="Search programs…"
        class="flex-1 border rounded px-3 py-2 bg-white"
      />
    </div>

    <div v-if="pending" class="text-slate-500">Loading…</div>
    <div v-else-if="error" class="text-red-600">Failed to load programs.</div>
    <div
      v-else-if="data && data.items.length === 0"
      class="text-slate-500 py-12 text-center bg-white rounded border"
    >
      No programs match your filters.
    </div>
    <ul v-else-if="data" class="space-y-3">
      <li
        v-for="program in data.items"
        :key="program.id"
        class="bg-white border rounded-lg p-4 hover:shadow-md transition"
      >
        <NuxtLink
          :to="`/programs/${program.id}`"
          class="flex items-center justify-between gap-3"
          :data-testid="`program-${program.id}`"
        >
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <span
              class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center"
              :aria-label="isProgramComplete(program.id) ? 'Completed' : undefined"
            >
              <svg
                v-if="isProgramComplete(program.id)"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="h-6 w-6 text-blue-600"
                :data-testid="`program-complete-${program.id}`"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                  clip-rule="evenodd"
                />
              </svg>
            </span>
            <div class="min-w-0">
              <div class="font-medium">{{ program.name }}</div>
              <div class="text-sm text-slate-500">
                {{ program.degreeType }} · deadline
                {{ formatDate(program.applicationDeadline) }}
              </div>
            </div>
          </div>
          <span class="text-brand-700 text-sm shrink-0">View →</span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useSessionStore } from "~/stores/session";
import type { Program, ProfileProgramSummary } from "~/types/api";
import { isProgramSummaryComplete } from "~/utils/programCompletion";

const session = useSessionStore();
const api = useApi();
const degreeType = ref("");
const q = ref("");

interface ListResponse {
  items: Program[];
  total: number;
  page: number;
  pageSize: number;
}

const query = computed(() => {
  const out: Record<string, string> = {};
  if (degreeType.value.length > 0) {
    out.degreeType = degreeType.value;
  }
  if (q.value.length > 0) {
    out.q = q.value;
  }
  return out;
});

const { data, pending, error } = await useAsyncData<ListResponse>(
  "programs",
  () => api.get<ListResponse>("/programs", query.value),
  { watch: [query] }
);

const { data: summaries } = await useAsyncData<ProfileProgramSummary[]>(
  computed(() => `program-summaries-browse-${session.profileId ?? "none"}`),
  async () => {
    if (!session.profileId) {
      return [];
    }
    try {
      const result = await api.get<ProfileProgramSummary[]>(
        `/profiles/${session.profileId}/program-summaries`
      );
      return Array.isArray(result) ? result : [];
    } catch {
      return [];
    }
  },
  { watch: [() => session.profileId], default: () => [] }
);

const completedProgramIds = computed(() => {
  const ids = new Set<string>();
  for (const summary of summaries.value ?? []) {
    if (summary != null && isProgramSummaryComplete(summary)) {
      ids.add(summary.programId);
    }
  }
  return ids;
});

function isProgramComplete(programId: string): boolean {
  return completedProgramIds.value.has(programId);
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
</script>
