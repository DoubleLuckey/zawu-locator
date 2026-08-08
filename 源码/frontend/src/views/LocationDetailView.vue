<template>
  <div class="page">
    <Breadcrumb :segments="pathSegments" @navigate="onNavigate" />
    <h1 class="page-title">{{ current?.name ?? '位置详情' }}</h1>

    <div v-if="current?.description" class="loc-desc card">{{ current.description }}</div>

    <div class="section-label children-head">
      <span class="children-head__count" :class="{ 'has-children': children.length > 0 }">
        子位置 · {{ children.length }}
      </span>
      <button
        v-if="children.length"
        class="head-btn"
        :class="{ 'is-active': reorderMode }"
        type="button"
        @click="reorderMode = !reorderMode"
      >
        {{ reorderMode ? '完成' : '排序' }}
      </button>
    </div>
    <div class="loc-list">
      <article
        v-for="(loc, i) in children"
        :key="loc.id"
        class="loc-card card tap fade-up"
        :style="{ animationDelay: `${i * 40}ms` }"
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
          </div>
        </div>
        <div class="loc-card__actions" @click.stop>
          <template v-if="reorderMode">
            <button
              class="icon-btn"
              type="button"
              title="上移"
              :disabled="i === 0"
              @click="swapChild(i, -1)"
            >
              <span v-html="upIcon"></span>
            </button>
            <button
              class="icon-btn"
              type="button"
              title="下移"
              :disabled="i === children.length - 1"
              @click="swapChild(i, 1)"
            >
              <span v-html="downIcon"></span>
            </button>
          </template>
          <template v-else>
            <button class="icon-btn" type="button" title="移动" @click="openMoveChild(loc)">
              <span v-html="moveIcon"></span>
            </button>
            <button class="icon-btn" type="button" title="编辑" @click="openEditChild(loc)">
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
      v-if="!children.length"
      icon="🗃️"
      text="这里没有子位置，可以新建（如纸箱里的袋子）"
    />

    <div class="section-label">物品 · {{ filteredItems.length }} 件</div>
    <div class="filter-row">
      <button
        v-for="s in statusFilters"
        :key="s.value"
        class="filter-chip"
        :class="{ 'is-active': statusFilter === s.value }"
        type="button"
        @click="statusFilter = s.value"
      >
        {{ s.label }}
      </button>
    </div>
    <div v-if="tagStore.tags.length" class="filter-row filter-row--tags">
      <button
        v-for="tag in tagStore.tags"
        :key="tag.id"
        class="filter-chip"
        :class="{ 'is-active': tagFilter === tag.id }"
        type="button"
        @click="tagFilter = tagFilter === tag.id ? null : tag.id"
      >
        {{ tag.name }}
      </button>
    </div>
    <div class="item-list">
      <ItemCard
        v-for="it in filteredItems"
        :key="it.id"
        :item="it"
        :path="pathText(it.locationId)"
        @click="goItem(it.id)"
      />
    </div>
    <EmptyState
      v-if="!filteredItems.length"
      icon="📦"
      text="这里还没有物品，点右下角添加"
    />

    <FabButton label="添加" @click="showActions = true" />

    <van-action-sheet
      v-model:show="showActions"
      :actions="fabActions"
      cancel-text="取消"
      @select="onFabSelect"
    />

    <van-popup v-model:show="showChildForm" position="bottom" round class="form-popup">
      <div class="form-popup__inner">
        <h3 class="form-popup__title">{{ childForm.id ? '编辑子位置' : '新建子位置' }}</h3>
        <van-field
          v-model="childForm.name"
          label="名称"
          placeholder="如 小袋子 / 第二层"
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
                :class="{ 'is-active': childForm.type === key }"
                @click="childForm.type = key"
              >
                {{ info.label }}
              </button>
            </div>
          </template>
        </van-field>
        <van-field v-model="childForm.description" label="描述" placeholder="可选" />
        <div class="form-popup__actions">
          <van-button plain type="primary" @click="showChildForm = false">取消</van-button>
          <van-button type="primary" @click="saveChild">保存</van-button>
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
            @click="moveChildToRoot"
          >
            移到根位置
          </van-button>
        </div>
        <div class="form-popup__actions">
          <van-button plain type="primary" @click="showMove = false">取消</van-button>
          <van-button type="primary" :disabled="!moveTarget" @click="confirmMoveChild">移动</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="showBatch" position="bottom" round class="form-popup">
      <div class="form-popup__inner">
        <h3 class="form-popup__title">批量录入物品</h3>
        <p class="batch-hint">每行一件物品，支持「名称×数量」，如：打火机×2</p>
        <textarea
          v-model="batchText"
          class="batch-input"
          rows="10"
          placeholder="螺丝刀
数据线×2
说明书"
        ></textarea>
        <div class="section-label batch-tag-label">给全部物品打标签（可选）</div>
        <div class="tag-pick">
          <button
            type="button"
            class="tag-pick__item"
            :class="{ 'is-active': batchTagId === null }"
            @click="batchTagId = null"
          >
            不打标签
          </button>
          <button
            v-for="tag in tagStore.tags"
            :key="tag.id"
            type="button"
            class="tag-pick__item"
            :class="{ 'is-active': batchTagId === tag.id }"
            @click="batchTagId = batchTagId === tag.id ? null : tag.id"
          >
            {{ tag.name }}
          </button>
        </div>
        <div class="form-popup__actions">
          <van-button plain type="primary" @click="showBatch = false">取消</van-button>
          <van-button type="primary" @click="saveBatch">录入</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import Breadcrumb from '@/components/Breadcrumb.vue'
import EmptyState from '@/components/EmptyState.vue'
import FabButton from '@/components/FabButton.vue'
import ItemCard from '@/components/ItemCard.vue'
import LocationPicker from '@/components/LocationPicker.vue'
import { LocationTypeMap } from '@/constants/enums'
import { useItemStore } from '@/stores/item'
import { useLocationStore } from '@/stores/location'
import { useTagStore } from '@/stores/tag'
import { buildPath } from '@/services/pathService'
import type { ItemStatus, LocationNode } from '@/types'

const route = useRoute()
const router = useRouter()
const locationStore = useLocationStore()
const itemStore = useItemStore()
const tagStore = useTagStore()

const locationId = computed(() => route.params.locationId as string)
const current = computed(() => locationStore.getById(locationId.value))
const pathSegments = computed(() =>
  current.value ? buildPath(locationId.value, locationStore.locations) : []
)
const children = computed(() => locationStore.childrenOf(locationId.value))

const statusFilter = ref<'ALL' | ItemStatus>('ALL')
const tagFilter = ref<string | null>(null)
const showActions = ref(false)
const showChildForm = ref(false)
const reorderMode = ref(false)
const showMove = ref(false)
const moving = ref<LocationNode | null>(null)
const moveTarget = ref<string | null>(null)
const showBatch = ref(false)
const batchText = ref('')
const batchTagId = ref<string | null>(null)
const childForm = reactive<{
  id: string | null
  name: string
  type: LocationNode['type']
  description: string
}>({ id: null, name: '', type: 'BOX', description: '' })

const statusFilters = [
  { value: 'ALL' as const, label: '全部' },
  { value: 'IN_STOCK' as const, label: '在库' },
  { value: 'BORROWED' as const, label: '借出' },
  { value: 'DISCARDED' as const, label: '已丢弃' }
]

const fabActions = [
  { name: '新增子位置', value: 'child' },
  { name: '新增物品', value: 'item' },
  { name: '批量录入物品', value: 'batch' }
]

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
  await Promise.all([locationStore.load(), itemStore.load(), tagStore.load()])
})

const filteredItems = computed(() => {
  let items = itemStore.byLocation(locationId.value)
  items =
    statusFilter.value === 'ALL'
    ? items
    : items.filter((i) => i.status === statusFilter.value)
  if (tagFilter.value) {
    const itemIds = new Set(tagStore.tagItemMap[tagFilter.value] ?? [])
    items = items.filter((i) => itemIds.has(i.id))
  }
  return items
})

function childCount(id: string): number {
  return locationStore.childrenOf(id).length
}

const moveExcludeIds = computed(() => {
  if (!moving.value) return []
  return [moving.value.id, ...locationStore.getDescendantIds(moving.value.id)]
})

function iconEmoji(loc: LocationNode): string {
  const map = {
    HOME: '🏠',
    BEDROOM: '🛏️',
    KITCHEN: '🍳',
    BATHROOM: '🛁',
    STUDY: '📚',
    STORAGE: '📦',
    OTHER: '🗃️'
  }
  return map[loc.icon ?? 'OTHER']
}

function pathText(id: string): string {
  return buildPath(id, locationStore.locations).join(' / ')
}

function goDetail(id: string): void {
  router.push(`/locations/${id}`)
}

function goItem(id: string): void {
  router.push(`/items/${id}`)
}

function onNavigate(index: number): void {
  if (index === -1) {
    router.push('/locations')
    return
  }
  const target = pathSegments.value.length
    ? locationStore.locations.find((l) => l.name === pathSegments.value[index])
    : undefined
  if (target) router.push(`/locations/${target.id}`)
}

function onFabSelect(action: { value: string }): void {
  showActions.value = false
  if (action.value === 'child') openAddChild()
  else if (action.value === 'batch') openBatch()
  else router.push(`/items/new?locationId=${locationId.value}`)
}

function openBatch(): void {
  batchText.value = ''
  batchTagId.value = null
  showBatch.value = true
}

function parseBatchLine(line: string): { name: string; quantity: number } {
  const text = line.trim().replace(/[。．.]+\s*$/, '')
  const m = text.match(/^(.*?)[×xX](\d+)$/)
  if (m && m[1]) return { name: m[1].trim(), quantity: Number(m[2]) }
  return { name: text, quantity: 1 }
}

async function saveBatch(): Promise<void> {
  const parsed = batchText.value
    .split(/\r?\n/)
    .map(parseBatchLine)
    .filter((l) => l.name)
  if (!parsed.length) {
    showToast('请至少输入一件物品')
    return
  }
  let count = 0
  for (const line of parsed) {
    const id = await itemStore.add({
      locationId: locationId.value,
      name: line.name,
      quantity: line.quantity,
      status: 'IN_STOCK'
    })
    if (batchTagId.value) await tagStore.setItemTags(id, [batchTagId.value])
    count++
  }
  showBatch.value = false
  showToast(`已录入 ${count} 件物品`)
}

async function swapChild(i: number, delta: number): Promise<void> {
  const list = children.value
  const j = i + delta
  if (j < 0 || j >= list.length) return
  await locationStore.swapSort(list[i].id, list[j].id)
}

function openMoveChild(loc: LocationNode): void {
  moving.value = loc
  moveTarget.value = null
  showMove.value = true
}

async function confirmMoveChild(): Promise<void> {
  if (!moving.value || !moveTarget.value) return
  await locationStore.move(moving.value.id, moveTarget.value)
  showMove.value = false
  showToast('已移动')
}

async function moveChildToRoot(): Promise<void> {
  if (!moving.value) return
  await locationStore.move(moving.value.id, null)
  showMove.value = false
  showToast('已移到根位置')
}

function openAddChild(): void {
  Object.assign(childForm, { id: null, name: '', type: 'BOX', description: '' })
  showChildForm.value = true
}

function openEditChild(loc: LocationNode): void {
  Object.assign(childForm, {
    id: loc.id,
    name: loc.name,
    type: loc.type,
    description: loc.description ?? ''
  })
  showChildForm.value = true
}

async function saveChild(): Promise<void> {
  if (!childForm.name.trim()) {
    showToast('请填写名称')
    return
  }
  if (childForm.id) {
    await locationStore.update(childForm.id, {
      name: childForm.name,
      type: childForm.type,
      description: childForm.description
    })
  } else {
    await locationStore.add({
      parentId: locationId.value,
      name: childForm.name,
      type: childForm.type,
      description: childForm.description
    })
  }
  showChildForm.value = false
  showToast('已保存')
}

async function confirmRemove(loc: LocationNode): Promise<void> {
  const childrenCount = locationStore.childrenOf(loc.id).length
  const itemsCount = itemStore.countByLocation(loc.id)
  if (childrenCount || itemsCount) {
    showToast(`请先清空该位置下的 ${childrenCount} 个子位置和 ${itemsCount} 件物品`)
    return
  }
  await showConfirmDialog({ title: '删除位置', message: `确定删除「${loc.name}」吗？` })
  await locationStore.remove(loc.id)
  showToast('已删除')
}
</script>

<style scoped>
.children-head {
  justify-content: space-between;
}

.children-head .head-btn {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  color: var(--color-ink-soft);
  padding: 4px 14px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  cursor: pointer;
}

.children-head .head-btn.is-active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-accent-deep);
}

.loc-desc {
  padding: 10px 14px;
  color: var(--color-ink-soft);
  font-size: 13px;
}

.loc-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.loc-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px;
}

.loc-card__icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
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
  font-size: 15px;
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

.children-head__count.has-children {
  color: var(--color-accent-deep);
  font-weight: 600;
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

.filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  overflow-x: auto;
}

.filter-row--tags {
  margin-top: -4px;
}

.filter-chip {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  color: var(--color-ink-soft);
  padding: 5px 14px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}

.filter-chip.is-active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-accent-deep);
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.type-select {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.type-select__item {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  cursor: pointer;
}

.type-select__item.is-active {
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

.batch-hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--color-muted);
}

.batch-input {
  width: 100%;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-m);
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.7;
  outline: none;
  resize: vertical;
  background: var(--color-surface);
}

.batch-tag-label {
  margin-top: 14px;
}

.tag-pick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-pick__item {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  color: var(--color-ink-soft);
  padding: 5px 14px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  cursor: pointer;
}

.tag-pick__item.is-active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-accent-deep);
}
</style>
