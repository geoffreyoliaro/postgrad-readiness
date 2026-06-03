<template>
  <section>
    <NuxtLink to="/programs" class="text-sm text-slate-500 hover:text-slate-700">
      ← Back to programs
    </NuxtLink>

    <div v-if="loadError" class="mt-6 text-red-600">
      Could not load your dashboard. The checklist may not exist yet —
      <NuxtLink
        :to="`/programs/${programId}`"
        class="text-brand-700 hover:underline"
      >
        start one
      </NuxtLink>
      .
    </div>
    <div v-else-if="!program || !checklist || !readiness" class="mt-6 text-slate-500">
      Loading…
    </div>
    <div v-else class="mt-4">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold">{{ program.name }}</h1>
        <p class="text-slate-600">
          {{ program.degreeType }} · deadline
          {{ formatDate(program.applicationDeadline) }}
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6 min-w-0">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadinessScore
              :score="readiness.readinessScore"
              :completed="readiness.completedRequired"
              :total="readiness.totalRequired"
            />
            <MissingCallout :missing="readiness.missingRequirements" />
          </div>

          <ChecklistGroup
            group-label="Application checklist"
            :items="chronologicalItems"
            @update="onUpdate"
          />
        </div>

        <aside class="lg:col-span-1">
          <div class="lg:sticky lg:top-6 space-y-4">
            <Reminders :events="timeline" :limit="5" />
            <Timeline :events="timeline" />
          </div>
        </aside>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type {
  ChecklistItemView,
  ChecklistResponse,
  Program,
  ReadinessResponse,
  TimelineEvent,
} from "~/types/api";

const route = useRoute();
const api = useApi();

const profileId = computed(() => String(route.params.profileId));
const programId = computed(() => String(route.params.programId));

const program = ref<Program | null>(null);
const checklist = ref<ChecklistResponse | null>(null);
const readiness = ref<ReadinessResponse | null>(null);
const timeline = ref<TimelineEvent[]>([]);
const loadError = ref(false);

/** Same order as the sidebar timeline (earliest due date first). */
const chronologicalItems = computed((): ChecklistItemView[] => {
  if (!checklist.value) {
    return [];
  }
  const byRequirementId = new Map(
    checklist.value.items.map((item) => [item.requirementId, item])
  );
  if (timeline.value.length > 0) {
    return timeline.value.flatMap((event) => {
      const item = byRequirementId.get(event.relatedRequirementId);
      return item !== undefined ? [item] : [];
    });
  }
  return [...checklist.value.items].sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) ||
      a.requirement.title.localeCompare(b.requirement.title)
  );
});

async function loadAll() {
  loadError.value = false;
  try {
    const [p, cl, r, t] = await Promise.all([
      api.get<Program>(`/programs/${programId.value}`),
      api.get<ChecklistResponse>(
        `/profiles/${profileId.value}/programs/${programId.value}/checklist`
      ),
      api.get<ReadinessResponse>(
        `/profiles/${profileId.value}/programs/${programId.value}/readiness`
      ),
      api.get<TimelineEvent[]>(
        `/profiles/${profileId.value}/programs/${programId.value}/timeline`
      ),
    ]);
    program.value = p;
    checklist.value = cl;
    readiness.value = r;
    timeline.value = t;
  } catch {
    loadError.value = true;
  }
}

async function refreshDerived() {
  const [r, t] = await Promise.all([
    api.get<ReadinessResponse>(
      `/profiles/${profileId.value}/programs/${programId.value}/readiness`
    ),
    api.get<TimelineEvent[]>(
      `/profiles/${profileId.value}/programs/${programId.value}/timeline`
    ),
  ]);
  readiness.value = r;
  timeline.value = t;
}

async function onUpdate(
  requirementId: string,
  patch: {
    status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";
    notes?: string | null;
    counselorNotes?: string | null;
  }
) {
  if (!checklist.value) {
    return;
  }
  const target = checklist.value.items.find(
    (i) => i.requirementId === requirementId
  );
  if (target === undefined) {
    return;
  }
  // Optimistic update so checkbox toggles feel instant; rollback on PATCH failure.
  const prevStatus = target.status;
  const prevNotes = target.notes;
  const prevCounselorNotes = target.counselorNotes;
  if (patch.status !== undefined) {
    target.status = patch.status;
  }
  if (patch.notes !== undefined) {
    target.notes = patch.notes;
  }
  if (patch.counselorNotes !== undefined) {
    target.counselorNotes = patch.counselorNotes;
  }
  try {
    await api.patch(
      `/profiles/${profileId.value}/programs/${programId.value}/checklist/${requirementId}`,
      patch
    );
    await refreshDerived();
  } catch {
    target.status = prevStatus;
    target.notes = prevNotes;
    target.counselorNotes = prevCounselorNotes;
  }
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

onMounted(loadAll);
</script>
