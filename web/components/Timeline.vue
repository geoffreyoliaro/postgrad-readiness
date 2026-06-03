<template>
  <section class="bg-white border rounded-lg p-6 lg:max-h-[calc(100vh-24rem)] lg:overflow-y-auto">
    <h3 class="font-semibold mb-4">Timeline</h3>
    <ol class="relative border-l-2 border-slate-200 space-y-5">
      <li
        v-for="event in sortedEvents"
        :key="event.id"
        class="relative pl-7"
      >
        <span
          class="absolute left-0 top-1.5 z-10 size-3 -translate-x-1/2 rounded-full border-2 border-white shadow-sm"
          :class="statusColor(event.status)"
          aria-hidden="true"
        />
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm min-w-0">
          <span class="font-medium">{{ event.title }}</span>
          <span
            class="text-xs px-2 py-0.5 rounded shrink-0"
            :class="statusBadge(event.status)"
          >
            {{ statusLabel(event.status) }}
          </span>
        </div>
        <div class="text-xs text-slate-500 mt-0.5">{{ formatDate(event.date) }}</div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TimelineEvent, ChecklistStatus } from "~/types/api";

const props = defineProps<{ events: TimelineEvent[] }>();

const sortedEvents = computed(() =>
  // Defensive sort: API already orders chronologically; keeps UI stable on refetch.
  [...props.events].sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
  )
);

function statusColor(s: ChecklistStatus): string {
  if (s === "COMPLETE") return "bg-emerald-500";
  if (s === "IN_PROGRESS") return "bg-amber-500";
  return "bg-slate-300";
}

function statusBadge(s: ChecklistStatus): string {
  if (s === "COMPLETE") return "bg-emerald-100 text-emerald-800";
  if (s === "IN_PROGRESS") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

function statusLabel(s: ChecklistStatus): string {
  if (s === "COMPLETE") return "complete";
  if (s === "IN_PROGRESS") return "in progress";
  return "not started";
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
