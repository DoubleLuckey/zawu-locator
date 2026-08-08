<template>
  <div class="page">
    <h1 class="page-title">标签</h1>

    <div class="tag-list">
      <div
        v-for="tag in tagStore.tags"
        :key="tag.id"
        class="tag-row card tap fade-up"
        @click="showItems(tag.id)"
      >
        <span class="tag-row__dot" :style="{ background: TagColorMap[tag.color].hex }"></span>
        <span class="tag-row__name">{{ tag.name }}</span>
        <span class="tag-row__count">{{ itemCount(tag.id) }} 件物品</span>
        <div class="tag-row__actions" @click.stop>
          <button class="icon-btn" type="button" title="编辑" @click="openEdit(tag)">
            <span v-html="editIcon"></span>
          </button>
          <button class="icon-btn icon-btn--danger" type="button" title="删除" @click="confirmRemove(tag)">
            <span v-html="trashIcon"></span>
          </button>
        </div>
      </div>
    </div>

    <EmptyState
      v-if="!tagStore.tags.length"
      icon="🏷️"
      text="还没有标签，点右下角创建（如 常用/重要/备用）"
    />

    <FabButton label="新建标签" @click="openAdd" />

    <van-popup v-model:show="showForm" position="bottom" round class="form-popup">
      <div class="form-popup__inner">
        <h3 class="form-popup__title">{{ form.id ? '编辑标签' : '新建标签' }}</h3>
        <van-field
          v-model="form.name"
          label="名称"
          placeholder="如 常用"
          maxlength="12"
        />
        <van-field label="颜色">
          <template #input>
            <div class="color-select">
              <button
                v-for="(info, key) in TagColorMap"
                :key="key"
                type="button"
                class="color-select__item"
                :class="{ 'is-active': form.color === key }"
                :style="{ background: info.hex }"
                :title="info.label"
                @click="form.color = key"
              ></button>
            </div>
          </template>
        </van-field>
        <div class="form-popup__actions">
          <van-button plain type="primary" @click="showForm = false">取消</van-button>
          <van-button type="primary" @click="save">保存</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="showItemsPopup" position="bottom" round class="form-popup">
      <div class="form-popup__inner">
        <h3 class="form-popup__title">「{{ activeTag?.name }}」下的物品</h3>
        <div class="item-list">
          <ItemCard
            v-for="it in taggedItems"
            :key="it.id"
            :item="it"
            :path="pathText(it.locationId)"
            @click="goItem(it.id)"
          />
        </div>
        <EmptyState v-if="!taggedItems.length" text="该标签下暂无物品" />
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import EmptyState from '@/components/EmptyState.vue'
import FabButton from '@/components/FabButton.vue'
import ItemCard from '@/components/ItemCard.vue'
import { TagColorMap } from '@/constants/enums'
import { useItemStore } from '@/stores/item'
import { useLocationStore } from '@/stores/location'
import { useTagStore } from '@/stores/tag'
import { buildPath } from '@/services/pathService'
import type { Tag, TagColor } from '@/types'

const router = useRouter()
const tagStore = useTagStore()
const itemStore = useItemStore()
const locationStore = useLocationStore()

const showForm = ref(false)
const showItemsPopup = ref(false)
const activeTagId = ref<string | null>(null)
const form = reactive<{ id: string | null; name: string; color: TagColor }>({
  id: null,
  name: '',
  color: 'GREEN'
})

const editIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/></svg>'
const trashIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 14h10l1-14"/></svg>'

onMounted(async () => {
  await Promise.all([tagStore.load(), itemStore.load(), locationStore.load()])
})

const activeTag = computed(() =>
  activeTagId.value ? tagStore.getById(activeTagId.value) : undefined
)

const taggedItems = computed(() => {
  if (!activeTagId.value) return []
  const ids = new Set(tagStore.tagItemMap[activeTagId.value] ?? [])
  return itemStore.items.filter((i) => ids.has(i.id))
})

function itemCount(tagId: string): number {
  return (tagStore.tagItemMap[tagId] ?? []).length
}

function openAdd(): void {
  Object.assign(form, { id: null, name: '', color: 'GREEN' })
  showForm.value = true
}

function openEdit(tag: Tag): void {
  Object.assign(form, { id: tag.id, name: tag.name, color: tag.color })
  showForm.value = true
}

async function save(): Promise<void> {
  if (!form.name.trim()) {
    showToast('请填写标签名称')
    return
  }
  try {
    if (form.id) {
      await tagStore.update(form.id, { name: form.name, color: form.color })
    } else {
      await tagStore.add(form.name, form.color)
    }
    showForm.value = false
    showToast('已保存')
  } catch (e) {
    showToast((e as Error).message || '保存失败')
  }
}

async function confirmRemove(tag: Tag): Promise<void> {
  await showConfirmDialog({
    title: '删除标签',
    message: `确定删除「${tag.name}」吗？物品不会受影响，仅解除绑定。`
  })
  await tagStore.remove(tag.id)
  showToast('已删除')
}

function showItems(tagId: string): void {
  activeTagId.value = tagId
  showItemsPopup.value = true
}

function pathText(locationId: string): string {
  return buildPath(locationId, locationStore.locations).join(' / ')
}

function goItem(id: string): void {
  showItemsPopup.value = false
  router.push(`/items/${id}`)
}
</script>

<style scoped>
.tag-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tag-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
}

.tag-row__dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-row__name {
  font-size: 15px;
  font-weight: 600;
}

.tag-row__count {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-muted);
}

.tag-row__actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-s);
  background: var(--color-surface);
  color: var(--color-ink-soft);
  cursor: pointer;
}

.icon-btn--danger {
  color: var(--color-red);
}

.icon-btn span {
  width: 16px;
  height: 16px;
}

.icon-btn :deep(svg) {
  width: 100%;
  height: 100%;
}

.form-popup {
  max-height: 85dvh;
}

.form-popup__inner {
  padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
}

.form-popup__title {
  margin: 0 0 14px;
  font-family: var(--font-display);
  font-size: 19px;
}

.color-select {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-select__item {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.color-select__item.is-active {
  border-color: var(--color-ink);
  transform: scale(1.12);
}

.form-popup__actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.form-popup__actions .van-button {
  flex: 1;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 55dvh;
  overflow-y: auto;
}
</style>
