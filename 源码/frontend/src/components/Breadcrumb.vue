<template>
  <nav class="crumb" aria-label="当前位置">
    <button class="crumb__item" type="button" @click="$emit('navigate', -1)">位置</button>
    <template v-for="(seg, i) in segments" :key="i">
      <span class="crumb__sep">/</span>
      <button
        v-if="i < segments.length - 1"
        class="crumb__item"
        type="button"
        @click="$emit('navigate', i)"
      >
        {{ seg }}
      </button>
      <span v-else class="crumb__item crumb__item--current">{{ seg }}</span>
    </template>
  </nav>
</template>

<script setup lang="ts">
defineProps<{ segments: string[] }>()
defineEmits<{ navigate: [index: number] }>()
</script>

<style scoped>
.crumb {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding: 10px 0 2px;
  font-size: 13px;
  -webkit-overflow-scrolling: touch;
}

.crumb__item {
  border: none;
  background: none;
  padding: 2px 0;
  color: var(--color-muted);
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}

.crumb__item--current {
  color: var(--color-ink);
  font-weight: 600;
}

.crumb__sep {
  color: var(--color-line);
}
</style>
