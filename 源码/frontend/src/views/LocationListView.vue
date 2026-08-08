<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">位置</h1>
      <button
        v-if="!filter"
        class="head-btn"
        :class="{ 'is-active': reorderMode }"
        type="button"
        @click="reorderMode = !reorderMode"
      >
        {{ reorderMode ? '完成' : '排序' }}
      </button>
    </div>

    <div class="searchbar">
      <span class="searchbar__icon" v-html="searchIcon"></span>
      <input
        v-model.trim="filter"
        class="searchbar__input"
        type="search"
        placeholder="按名称筛选位置"
      />
    </div>

    <div class="loc-list">
      <article
        v-for="(loc, i) in filteredRoots"
        :key="loc.id"
        class="loc-card card tap fade-up"
        :style="{ animationDelay: `${i * 50}ms` }"
        @click="goDetail(loc.id)"
      >
        <div class="loc-card__icon">{{ iconEmoji(loc) }}</div>
        <div class="loc-card__body">
          <div class="loc-card__head">
            <h3 class="loc-card__name">{{ loc.name }}</h3>
            <span class="loc-card__type">{{ LocationTypeMap[loc.type].label }}</span>
          </div>
          <div class="loc-card__meta">
            <span v-if="childCount(loc.id) > 0" class="loc-card__children">🗂 {{ childCount(loc.id) }} 个子位置</span>
            <span v-else class="loc-card__no-children">无子位置</span>
            <span>{{ itemStore.countByLocation(loc.id) }} 件物品</span>
            <span>{{ formatDate(loc.updatedAt) }} 更新</span>
          </div>
        </div>
        <div class="loc-card__actions" @click.stop>
          <template v-if="reorderMode">
            <button
              class="icon-btn"
              type="button"
              title="上移"
              :disabled="i === 0"
              @click="swapRoot(i, -1)"
            >
              <span v-html="upIcon"></span>
            </button>
            <button
              class="icon-btn"
              type="button"
              title="下移"
              :disabled="i === filteredRoots.length - 1"
              @click="swapRoot(i, 1)"
            >
              <span v-html="downIcon"></span>
            </button>
          </template>
          <template v-else>
            <button class="icon-btn" type="button" title="移动" @click="openMove(loc)">
              <span v-html="moveIcon"></span>
            </button>
            <button class="icon-btn" type="button" title="编辑" @click="openEdit(loc)">
              <span v-html="editIcon"></span>
            </button>
            <button class="icon-btn icon-btn--danger" type="button" title="删除" @click="confirmRemove(loc)">
              <span v-html="trashIcon"></span>
            </button>
          </template>
        </div>
      </article>
    </div>

    <EmptyState
      v-if="!filteredRoots.length"
      icon="🏠"
      text="还没有位置，点右下角新建第一个（如卧室、储物间）"
    />

    <FabButton label="新建位置" @click="openAdd" />

    <van-popup v-model:show="showForm" position="bottom" round class="form-popup">
      <div class="form-popup__inner">
        <h3 class="form-popup__title">{{ form.id ? '编辑位置' : '新建位置' }}</h3>
        <van-field
          v-model="form.name"
          label="名称"
          placeholder="如 卧室 / 纸箱A / 小袋子"
          maxlength="30"
        />
        <van-field label="类型">
          <template #input>
            <div class="type-select">
              <button
                v-for="(info, key) in LocationTypeMap"
                :key="key"
                type="button"
                class="type-select__item"
                :class="{ 'is-active': form.type === key }"
                @click="form.type = key"
              >
                {{ info.label }}
              </button>
            </div>
          </template>
        </van-field>
        <van-field label="图标">
          <template #input>
            <div class="icon-select">
              <button
                v-for="(info, key) in SpaceIconMap"
                :key="key"
                type="button"
                class="icon-select__item"
                :class="{ 'is-active': form.icon === key }"
                @click="form.icon = key"
              >
                {{ iconEmojiByIcon(key) }}
              </button>
            </div>
          </template>
        </van-field>
        <van-field v-model="form.description" label="描述" placeholder="可选，如'进门左侧'" />
        <div class="form-popup__actions">
          <van-button plain type="primary" @click="showForm = false">取消</van-button>
          <van-button type="primary" @click="saveForm">保存</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="showMove" position="bottom" round class="form-popup">
      <div class="form-popup__inner">
        <h3 class="form-popup__title">移动「{{ moving?.name }}」到</h3>
        <LocationPicker v-model="moveTarget" :exclude-ids="moveExcludeIds" />
        <div class="move-root-row">
          <van-button
            v-if="moving?.parentId"
            size="small"
            plain
            @click="moveToRoot"
          >
            移到根位置
          </van-button>
        </div>
        <div class="form-popup__actions">
          <van-button plain type="primary" @click="showMove = false">取消</van-button>
          <van-button type="primary" :disabled="!moveTarget" @click="confirmMove">移动</van-button>
        </div>
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
import LocationPicker from '@/components/LocationPicker.vue'
import { LocationTypeMap, SpaceIconMap } from '@/constants/enums'
import { useItemStore } from '@/stores/item'
import { useLocationStore } from '@/stores/location'
import type { LocationNode, SpaceIcon } from '@/types'
import { formatDate } from '@/utils/date'

const router = useRouter()
const locationStore = useLocationStore()
const itemStore = useItemStore()

const filter = ref('')
const showForm = ref(false)
const reorderMode = ref(false)
const showMove = ref(false)
const moving = ref<LocationNode | null>(null)
const moveTarget = ref<string | null>(null)
const form = reactive<{
  id: string | null
  name: string
  type: LocationNode['type']
  icon: SpaceIcon
  description: string
}>({ id: null, name: '', type: 'ROOM', icon: 'OTHER', description: '' })

const searchIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>'
const editIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/></svg>'
const trashIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 14h10l1-14"/></svg>'
const upIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 6-6 6 6"/></svg>'
const downIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 10 6 6 6-6"/></svg>'
const moveIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9 3 12l5 3V9Z"/><path d="M16 9l5 3-5 3V9Z"/><path d="M12 5v14"/></svg>'

onMounted(async () => {
  await Promise.all([locationStore.load(), itemStore.load()])
})

const filteredRoots = computed(() => {
  const roots = locationStore.rootLocations
  if (!filter.value) return roots
  return roots.filter((l) => l.name.includes(filter.value))
})

function childCount(id: string): number {
  return locationStore.childrenOf(id).length
}

const moveExcludeIds = computed(() => {
  if (!moving.value) return []
  return [moving.value.id, ...locationStore.getDescendantIds(moving.value.id)]
})

function iconEmoji(loc: LocationNode): string {
  return iconEmojiByIcon(loc.icon ?? 'OTHER')
}

function iconEmojiByIcon(icon: SpaceIcon): string {
  return {
    HOME: '🏠',
    BEDROOM: '🛏️',
    KITCHEN: '🍳',
    BATHROOM: '🛁',
    STUDY: '📚',
    STORAGE: '📦',
    OTHER: '🗃️'
  }[icon]
}

function goDetail(id: string): void {
  router.push(`/locations/${id}`)
}

function openAdd(): void {
  Object.assign(form, { id: null, name: '', type: 'ROOM', icon: 'OTHER', description: '' })
  showForm.value = true
}

function openEdit(loc: LocationNode): void {
  Object.assign(form, {
    id: loc.id,
    name: loc.name,
    type: loc.type,
    icon: loc.icon ?? 'OTHER',
    description: loc.description ?? ''
  })
  showForm.value = true
}

function openMove(loc: LocationNode): void {
  moving.value = loc
  moveTarget.value = null
  showMove.value = true
}

async function swapRoot(i: number, delta: number): Promise<void> {
  const list = filteredRoots.value
  const j = i + delta
  if (j < 0 || j >= list.length) return
  await locationStore.swapSort(list[i].id, list[j].id)
}

async function confirmMove(): Promise<void> {
  if (!moving.value || !moveTarget.value) return
  await locationStore.move(moving.value.id, moveTarget.value)
  showMove.value = false
  showToast('已移动')
}

async function moveToRoot(): Promise<void> {
  if (!moving.value) return
  await locationStore.move(moving.value.id, null)
  showMove.value = false
  showToast('已移到根位置')
}

async function saveForm(): Promise<void> {
  if (!form.name.trim()) {
    showToast('请填写名称')
    return
  }
  if (form.id) {
    await locationStore.update(form.id, {
      name: form.name,
      type: form.type,
      icon: form.icon,
      description: form.description
    })
    showToast('已保存')
  } else {
    await locationStore.add({
      parentId: null,
      name: form.name,
      type: form.type,
      icon: form.icon,
      description: form.description
    })
    showToast('位置已创建')
  }
  showForm.value = false
}

async function confirmRemove(loc: LocationNode): Promise<void> {
  const children = locationStore.childrenOf(loc.id).length
  const items = itemStore.countByLocation(loc.id)
  if (children || items) {
    showToast(`请先清空该位置下的 ${children} 个子位置和 ${items} 件物品`)
    return
  }
  await showConfirmDialog({ title: '删除位置', message: `确定删除「${loc.name}」吗？` })
  await locationStore.remove(loc.id)
  showToast('已删除')
}
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-head .page-title {
  margin-bottom: var(--space-4);
}

.head-btn {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  color: var(--color-ink-soft);
  padding: 6px 16px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  cursor: pointer;
}

.head-btn.is-active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-accent-deep);
}

.searchbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  box-shadow: var(--shadow-card);
}

.searchbar__icon {
  width: 18px;
  height: 18px;
  color: var(--color-muted);
  flex-shrink: 0;
}

.searchbar__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.searchbar__input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: 15px;
}

.loc-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.loc-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
}

.loc-card__icon {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: var(--color-surface-2);
  border-radius: var(--radius-m);
}

.loc-card__body {
  flex: 1;
  min-width: 0;
}

.loc-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loc-card__name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.loc-card__type {
  font-size: 11px;
  color: var(--color-muted);
  background: var(--color-surface-2);
  padding: 1px 8px;
  border-radius: var(--radius-pill);
}

.loc-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 3px;
  font-size: 12px;
  color: var(--color-muted);
}

.loc-card__children {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent-deep);
  background: var(--color-accent-soft);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.loc-card__no-children {
  color: var(--color-muted);
}

.loc-card__actions {
  display: flex;
  flex-direction: column;
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

.icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
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

.type-select,
.icon-select {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.type-select__item,
.icon-select__item {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  cursor: pointer;
}

.type-select__item.is-active,
.icon-select__item.is-active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-accent-deep);
}

.form-popup__actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.form-popup__actions .van-button {
  flex: 1;
}

.move-root-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
</style>
