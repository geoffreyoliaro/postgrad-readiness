<template>
  <div
    v-if="missing.length > 0"
    class="bg-amber-50 border border-amber-200 rounded-lg p-4"
  >
    <div class="font-medium text-amber-900 mb-2">
      {{ missing.length }} required item{{ missing.length === 1 ? "" : "s" }} still missing
    </div>
    <ul class="text-sm text-amber-900 list-disc pl-5 space-y-1">
      <li v-for="m in missing" :key="m.id">{{ m.title }}</li>
    </ul>
  </div>
  <div
    v-else
    class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-900"
  >
    All required items are complete.
  </div>
</template>

<script setup lang="ts">
import type { Requirement } from "~/types/api";
defineProps<{ missing: Requirement[] }>();
</script>
