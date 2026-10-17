<script setup lang="ts">
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import LockScreen from "@/components/security/LockScreen.vue";
import UpdateBanner from "@/components/app/UpdateBanner.vue";
import { useAppLock } from "@/composables/useAppLock";

const { locked } = useAppLock();
</script>

<template>
  <LockScreen v-if="locked" />
  <DefaultLayout v-else>
    <RouterView />
  </DefaultLayout>
  <UpdateBanner v-if="!locked" />
</template>
