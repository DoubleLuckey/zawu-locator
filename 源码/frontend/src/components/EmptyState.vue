<template>
  <div class="empty">
    <span class="empty__icon">{{ icon }}</span>
    <p class="empty__text">{{ text }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ icon?: string; text: string }>(), {
  icon: '🗂️'
})
</script>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 24px;
  text-align: center;
}

.empty__icon {
  font-size: 44px;
  filter: saturate(0.6);
}

.empty__text {
  margin: 0;
  color: var(--color-muted);
  font-size: 14px;
}
</style>
