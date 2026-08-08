<template>
  <button class="fab" type="button" @click="$emit('click')">
    <span class="fab__icon" v-html="icon"></span>
    <span v-if="label" class="fab__label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{ icon?: string; label?: string }>(),
  {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    label: ''
  }
)

defineEmits<{ click: [] }>()
</script>

<style scoped>
.fab {
  position: fixed;
  right: 18px;
  bottom: calc(84px + env(safe-area-inset-bottom));
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 13px 15px;
  border: none;
  border-radius: var(--radius-l);
  background: var(--color-accent);
  color: #fff;
  box-shadow: var(--shadow-float);
  cursor: pointer;
  transition: transform 0.14s ease, background 0.18s ease;
}

.fab:active {
  transform: scale(0.93);
  background: var(--color-accent-deep);
}

.fab__icon {
  width: 24px;
  height: 24px;
  display: block;
}

.fab__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.fab__label {
  font-size: 11px;
  letter-spacing: 1px;
}
</style>
