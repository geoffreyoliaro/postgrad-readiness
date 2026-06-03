<template>
  <section>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">My programs</h1>
      <NuxtLink
        to="/programs"
        class="text-sm text-brand-700 hover:underline"
      >
        + Add another program
      </NuxtLink>
    </div>

    <div v-if="!session.profileId" class="text-slate-500">
      <NuxtLink to="/" class="text-brand-700 hover:underline">
        Create a profile
      </NuxtLink>
      to track programs.
    </div>
    <div v-else-if="pending" class="text-slate-500">Loading…</div>
    <div v-else-if="error" class="text-red-600">
      Failed to load your programs.
    </div>
    <div
      v-else-if="data && data.length === 0"
      class="bg-white border rounded-lg p-8 text-center text-slate-500"
    >
      You haven't started a checklist yet.
      <NuxtLink to="/programs" class="text-brand-700 hover:underline">
        Browse programs →
      </NuxtLink>
    </div>
    <div v-else-if="data" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <NuxtLink
        v-for="s in sorted"
        :key="s.programId"
        :to="`/dashboard/${session.profileId}/${s.programId}`"
        class="bg-white border rounded-lg p-5 hover:shadow-md transition block"
        :data-testid="`summary-${s.programId}`"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="font-medium truncate">{{ s.programName }}</div>
            <div class="text-xs text-slate-500">
              {{ s.degreeType }} · deadline
              {{ formatDate(s.applicationDeadline) }}
            </div>
          </div>
          <div
            class="text-lg font-semibold"
            :class="scoreColor(s.readinessScore)"
          >
            {{ Math.round(s.readinessScore * 100) }}%
          </div>
        </div>
        <div class="mt-3">
          <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full transition-all duration-500"
              :class="barColor(s.readinessScore)"
              :style="{ width: `${Math.round(s.readinessScore * 100)}%` }"
            />
          </div>
          <div class="mt-2 flex justify-between text-xs text-slate-500">
            <span>
              {{ s.completedRequired }} / {{ s.totalRequired }} required complete
            </span>
            <span v-if="s.nextDueDate !== null">
              next: {{ formatDate(s.nextDueDate) }}
            </span>
            <span v-else>All done</span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSessionStore } from "~/stores/session";
import type { ProfileProgramSummary } from "~/types/api";

const session = useSessionStore();
const api = useApi();

const { data, pending, error } = await useAsyncData<ProfileProgramSummary[]>(
  computed(() => `program-summaries-${session.profileId ?? "none"}`),
  () => {
    if (!session.profileId) {
      return Promise.resolve([]);
    }
    return api.get<ProfileProgramSummary[]>(
      `/profiles/${session.profileId}/program-summaries`
    );
  },
  { watch: [() => session.profileId] }
);

const sorted = computed(() => {
  if (!data.value) {
    return [];
  }
  return [...data.value]
    .filter((s) => s != null && typeof s.readinessScore === "number")
    .sort((a, b) => b.readinessScore - a.readinessScore);
});

function scoreColor(score: number): string {
  if (score >= 0.75) return "text-emerald-600";
  if (score >= 0.4) return "text-amber-600";
  return "text-slate-700";
}

function barColor(score: number): string {
  if (score >= 0.75) return "bg-emerald-500";
  if (score >= 0.4) return "bg-amber-500";
  return "bg-brand-500";
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
</script>
