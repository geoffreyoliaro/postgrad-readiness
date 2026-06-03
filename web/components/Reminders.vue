<template>
  <section
    class="bg-white border rounded-lg p-6"
    data-testid="reminders"
  >
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold">Upcoming reminders</h3>
      <span class="text-xs text-slate-500">
        {{ reminders.length }} pending
      </span>
    </div>
    <p
      v-if="reminders.length === 0"
      class="text-sm text-slate-500"
    >
      Nothing on the horizon — every required item is complete.
    </p>
    <ul v-else class="space-y-3">
      <li
        v-for="r in reminders"
        :key="r.id"
        class="flex items-start gap-3"
        :data-testid="`reminder-${r.relatedRequirementId}`"
      >
        <span
          class="mt-1.5 w-2 h-2 rounded-full shrink-0"
          :class="dotClass(r.daysUntil)"
        />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ r.title }}</div>
          <div class="text-xs flex items-center gap-2">
            <span :class="labelClass(r.daysUntil)">
              {{ relativeLabel(r.daysUntil) }}
            </span>
            <span class="text-slate-400">·</span>
            <span class="text-slate-500">{{ formatDate(r.date) }}</span>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TimelineEvent } from "~/types/api";

const props = defineProps<{
  events: TimelineEvent[];
  limit?: number;
}>();

interface Reminder extends TimelineEvent {
  daysUntil: number;
}

const reminders = computed<Reminder[]>(() => {
  const today = startOfTodayUtc();
  // Re-sort client-side: timeline from the API is chronological but reminders
  // only show incomplete items, ordered by soonest due date.
  return props.events
    .filter((e) => e.status !== "COMPLETE")
    .map((e) => ({ ...e, daysUntil: daysBetween(today, e.date) }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, props.limit ?? 5);
});

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

function daysBetween(from: Date, iso: string): number {
  const to = new Date(`${iso}T00:00:00Z`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function relativeLabel(days: number): string {
  if (days < 0) {
    const overdue = Math.abs(days);
    return `${overdue} day${overdue === 1 ? "" : "s"} overdue`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 30) return `Due in ${days} days`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `Due in ~${months} month${months === 1 ? "" : "s"}`;
  }
  const years = Math.round(days / 365);
  return `Due in ~${years} year${years === 1 ? "" : "s"}`;
}

function dotClass(days: number): string {
  if (days < 14) return "bg-red-500";
  if (days < 30) return "bg-amber-500";
  if (days < 90) return "bg-blue-500";
  return "bg-slate-400";
}

function labelClass(days: number): string {
  if (days < 14) return "text-red-700 font-medium";
  if (days < 30) return "text-amber-700 font-medium";
  if (days < 90) return "text-blue-700";
  return "text-slate-600";
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
</script>
