<!--
 * LocaleSwitcher - 语言切换组件
 *
 * 功能：
 * - 提供语言切换下拉选择框
 * - 支持简体中文和英文切换
 * - 自动保存语言偏好到localStorage
 *
 * 主要方法：
 * - handleChange(event): 处理语言切换事件
 *
 * 上游调用：
 * - App.vue: 显示在页面头部
 *
 * 下游依赖：
 * - i18n/index.ts: useCurrentLocale(), setLocale() 语言管理
 *
 * 支持语言：
 * - zh-CN: 简体中文
 * - en-US: English
 -->
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
