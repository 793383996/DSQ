<template>
  <section
    class="dsq-app-shell"
    hidden
    aria-hidden="true"
    :data-boot-phase="appStore.bootPhase"
    :data-locale="uiStore.locale"
  />
  <Teleport to="#layout-control">
    <DsqControlView />
  </Teleport>
  <Teleport to="#UIselector">
    <DsqRequirementSelector />
  </Teleport>
  <Teleport to="#Split">
    <DsqSplitDialog />
  </Teleport>
  <Teleport to="#result">
    <DsqResultView />
  </Teleport>
</template>

<script setup lang="ts">
import { Teleport } from "vue";

import DsqControlView from "../components/DsqControlView.vue";
import DsqRequirementSelector from "../components/DsqRequirementSelector.vue";
import DsqResultView from "../components/DsqResultView.vue";
import DsqSplitDialog from "../components/DsqSplitDialog.vue";
import { useAppStore } from "../stores/app";
import { useUiStore } from "../stores/ui";

const appStore = useAppStore();
const uiStore = useUiStore();
</script>
