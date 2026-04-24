<template>
  <section
    class="dsq-app-shell"
    hidden
    aria-hidden="true"
    :data-boot-phase="appStore.bootPhase"
    :data-locale="uiStore.locale"
  />
</template>

<script setup lang="ts">
import { useAppStore } from "../stores/app";
import { useUiStore } from "../stores/ui";

const appStore = useAppStore();
const uiStore = useUiStore();
</script>
