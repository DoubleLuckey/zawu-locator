<template>
  <article class="item-card tap" @click="$emit('click')">
    <div class="item-card__thumb">
      <img v-if="photoUrl" :src="photoUrl" alt="" />
      <span v-else class="item-card__emoji">📦</span>
    </div>
    <div class="item-card__body">
      <div class="item-card__head">
        <h3 class="item-card__name">{{ item.name }}</h3>
        <span class="badge" :class="`badge--${item.status.toLowerCase()}`">
          {{ ItemStatusMap[item.status].label }}
        </span>
      </div>
      <div class="item-card__meta">
        <span v-if="item.quantity > 0" class="item-card__qty">
          {{ item.quantity }}{{ item.unit || '件' }}
        </span>
        <span v-if="path" class="item-card__path">{{ path }}</span>
      </div>
      <div v-if="tagNames.length" class="item-card__tags">
        <span
          v-for="tag in tagNames"
          :key="tag.id"
          class="item-card__tag"
          :style="{ background: TagColorMap[tag.color].hex + '22', color: TagColorMap[tag.color].hex }"
        >
          {{ tag.name }}
        </span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ItemStatusMap, TagColorMap } from '@/constants/enums'
import { useTagStore } from '@/stores/tag'
import type { Item } from '@/types'

const props = defineProps<{ item: Item; path?: string }>()
defineEmits<{ click: [] }>()

const tagStore = useTagStore()

const tagNames = computed(() => {
  const ids = tagStore.itemTagMap[props.item.id] ?? []
  return ids.map((id) => tagStore.getById(id)).filter((t) => !!t)
})

const photoUrl = ref<string | null>(null)
let objectUrl: string | null = null

watch(
  () => props.item.photoBlob,
  (blob) => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = blob ? URL.createObjectURL(blob) : null
    photoUrl.value = objectUrl
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
})
</script>

<style scoped>
.item-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-card);
}

.item-card__thumb {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-s);
  background: var(--color-surface-2);
  overflow: hidden;
}

.item-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-card__emoji {
  font-size: 24px;
}

.item-card__body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.item-card__name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-muted);
}

.item-card__path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-card__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.item-card__tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: var(--radius-pill);
}
</style>
