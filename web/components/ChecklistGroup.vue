<template>
  <section class="bg-white border rounded-lg p-6">
    <h3 class="font-semibold mb-4 capitalize">
      {{ groupLabel }}
      <span class="ml-2 text-sm text-slate-500 font-normal">
        ({{ items.length }})
      </span>
    </h3>
    <ul class="divide-y">
      <li
        v-for="item in items"
        :key="item.id"
        class="py-3 flex items-start gap-3"
        :data-testid="`item-${item.requirementId}`"
      >
        <input
          type="checkbox"
          class="mt-1 h-4 w-4 accent-brand-600"
          :checked="item.status === 'COMPLETE'"
          :data-testid="`checkbox-${item.requirementId}`"
          @change="toggle(item)"
        />
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span
              :class="{
                'line-through text-slate-500': item.status === 'COMPLETE',
              }"
              class="font-medium"
            >
              {{ item.requirement.title }}
            </span>
            <span
              v-if="!item.requirement.required"
              class="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600"
            >
              optional
            </span>
            <span
              v-if="item.status === 'IN_PROGRESS'"
              class="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800"
            >
              in progress
            </span>
          </div>
          <div class="text-sm text-slate-600">
            {{ item.requirement.description }}
          </div>
          <div class="text-xs text-slate-500 mt-1">
            due {{ formatDate(item.dueDate) }}
          </div>
          <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            <label class="text-xs text-slate-600">
              Your notes
              <textarea
                v-model="notesLocal[item.requirementId]"
                placeholder="Your notes…"
                rows="2"
                class="mt-0.5 w-full border rounded px-2 py-1 text-sm bg-slate-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
                @blur="saveNotes(item)"
              />
            </label>
            <label class="text-xs text-slate-600">
              Counselor notes
              <textarea
                v-model="counselorNotesLocal[item.requirementId]"
                placeholder="Counselor feedback…"
                rows="2"
                class="mt-0.5 w-full border rounded px-2 py-1 text-sm bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                @blur="saveCounselorNotes(item)"
              />
            </label>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import type { ChecklistItemView } from "~/types/api";

const props = defineProps<{
  groupLabel: string;
  items: ChecklistItemView[];
}>();

const emit = defineEmits<{
  update: [
    requirementId: string,
    patch: {
      status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";
      notes?: string | null;
      counselorNotes?: string | null;
    },
  ];
}>();

const notesLocal = reactive<Record<string, string>>({});
const counselorNotesLocal = reactive<Record<string, string>>({});

watch(
  () => props.items,
  (items) => {
    for (const item of items) {
      if (!(item.requirementId in notesLocal)) {
        notesLocal[item.requirementId] = item.notes ?? "";
      }
      if (!(item.requirementId in counselorNotesLocal)) {
        counselorNotesLocal[item.requirementId] = item.counselorNotes ?? "";
      }
    }
  },
  { immediate: true }
);

function toggle(item: ChecklistItemView) {
  const nextStatus =
    item.status === "COMPLETE" ? "NOT_STARTED" : "COMPLETE";
  emit("update", item.requirementId, { status: nextStatus });
}

function saveNotes(item: ChecklistItemView) {
  const current = notesLocal[item.requirementId] ?? "";
  const trimmed = current.length === 0 ? null : current;
  if (trimmed === item.notes) {
    return;
  }
  emit("update", item.requirementId, { notes: trimmed });
}

function saveCounselorNotes(item: ChecklistItemView) {
  const current = counselorNotesLocal[item.requirementId] ?? "";
  const trimmed = current.length === 0 ? null : current;
  if (trimmed === item.counselorNotes) {
    return;
  }
  emit("update", item.requirementId, { counselorNotes: trimmed });
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
