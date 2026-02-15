<script setup lang="ts">
import Skeleton from './Skeleton.vue'

interface Props {
  rows?: number
  columns?: number
  showHeader?: boolean
}

withDefaults(defineProps<Props>(), {
  rows: 5,
  columns: 4,
  showHeader: true
})
</script>

<template>
  <div class="skeleton-table">
    <div v-if="showHeader" class="skeleton-table-header">
      <div v-for="col in columns" :key="col" class="skeleton-table-cell">
        <Skeleton height="16" />
      </div>
    </div>

    <div class="skeleton-table-body">
      <div v-for="row in rows" :key="row" class="skeleton-table-row">
        <div v-for="col in columns" :key="col" class="skeleton-table-cell">
          <Skeleton height="14" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.skeleton-table-header {
  display: flex;
  background: rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.skeleton-table-body {
  display: flex;
  flex-direction: column;
}

.skeleton-table-row {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.skeleton-table-row:last-child {
  border-bottom: none;
}

.skeleton-table-cell {
  flex: 1;
  padding: 12px 16px;
  min-width: 100px;
}
</style>
