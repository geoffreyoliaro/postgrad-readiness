<template>
  <div class="bg-white border rounded-lg p-6 flex items-center gap-6">
    <div class="relative w-24 h-24">
      <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
        <path
          d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32"
          fill="none"
          stroke="#e2e8f0"
          stroke-width="3"
        />
        <path
          d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32"
          fill="none"
          stroke="#4f46e5"
          stroke-width="3"
          :stroke-dasharray="`${pct}, 100`"
          stroke-linecap="round"
          class="transition-all duration-500"
        />
      </svg>
      <div
        class="absolute inset-0 flex items-center justify-center font-semibold text-xl"
        data-testid="readiness-pct"
      >
        {{ Math.round(pct) }}%
      </div>
    </div>
    <div>
      <div class="font-semibold text-lg">Readiness</div>
      <div class="text-sm text-slate-600">
        {{ completed }} of {{ total }} required items complete
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  score: number;
  completed: number;
  total: number;
}>();

const pct = computed(() => props.score * 100);
</script>
