<template>
  <nav class="tabbar">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.path"
      :to="tab.path"
      class="tabbar__item"
      :class="{ 'is-active': isActive(tab.path) }"
    >
      <span class="tabbar__icon" v-html="tab.icon"></span>
      <span class="tabbar__label">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  {
    path: '/',
    label: '首页',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>'
  },
  {
    path: '/locations',
    label: '位置',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 17 8 4 8-4"/></svg>'
  },
  {
    path: '/tags',
    label: '标签',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h7l11 11-7 7L3 10V3Z"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/></svg>'
  },
  {
    path: '/settings',
    label: '设置',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"/></svg>'
  }
]

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<style scoped>
.tabbar {
  display: flex;
  background: rgba(255, 253, 246, 0.92);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--color-line);
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
}

.tabbar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 5px 0;
  color: var(--color-muted);
  text-decoration: none;
  border-radius: var(--radius-m);
  transition: color 0.18s ease, background 0.18s ease;
}

.tabbar__item.is-active {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.tabbar__icon {
  width: 24px;
  height: 24px;
}

.tabbar__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.tabbar__label {
  font-size: 11px;
  letter-spacing: 1px;
}
</style>
