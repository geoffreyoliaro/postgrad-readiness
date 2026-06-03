<template>
  <section class="max-w-2xl mx-auto text-center">
    <h1 class="text-3xl font-semibold mb-3">Plan your path to admission</h1>
    <p class="text-slate-600 mb-8">
      Track requirements, deadlines, and readiness across the programs you're
      applying to.
    </p>
    <div v-if="session.isAuthenticated" class="flex justify-center gap-3">
      <NuxtLink
        to="/my-programs"
        class="bg-brand-600 text-white font-medium px-5 py-2.5 rounded hover:bg-brand-700"
      >
        Go to my programs
      </NuxtLink>
      <NuxtLink
        to="/programs"
        class="border border-slate-300 px-5 py-2.5 rounded hover:bg-slate-100"
      >
        Browse programs
      </NuxtLink>
    </div>
    <div v-else class="flex justify-center gap-3">
      <NuxtLink
        to="/register"
        class="bg-brand-600 text-white font-medium px-5 py-2.5 rounded hover:bg-brand-700"
      >
        Create your profile
      </NuxtLink>
      <NuxtLink
        to="/login"
        class="border border-slate-300 px-5 py-2.5 rounded hover:bg-slate-100"
      >
        Log in
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useSessionStore } from "~/stores/session";
const session = useSessionStore();
</script>
