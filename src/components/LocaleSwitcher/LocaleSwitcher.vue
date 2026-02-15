<template>
  <div class="locale-switcher">
    <select :value="currentLocale" class="locale-select" @change="handleChange">
      <option value="zh-CN">简体中文</option>
      <option value="en-US">English</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { useCurrentLocale, setLocale } from '../../i18n'

const currentLocale = useCurrentLocale()

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  setLocale(target.value)
}
</script>

<style scoped>
.locale-switcher {
  display: inline-block;
}

.locale-select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.locale-select:hover {
  border-color: #9ca3af;
}

.locale-select:focus {
  outline: none;
  border-color: #3b82f6;
}
</style>
