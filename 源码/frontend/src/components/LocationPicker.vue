<template>
  <div class="picker">
    <div v-if="selectedPath.length" class="picker__selected">
      <span class="picker__selected-label">已选位置</span>
      <span class="picker__selected-path">{{ selectedPath.join(' / ') }}</span>
    </div>

    <div v-if="trail.length" class="picker__trail">
      <button type="button" class="picker__back" @click="goUp">
        <span class="picker__back-icon" v-html="backIcon"></span>
        返回上一级
      </button>
      <span class="picker__trail-text">{{ trail[trail.length - 1].name }}</span>
    </div>

    <div v-if="!currentList.length" class="picker__empty">
      该位置下没有子位置{{ selectAny ? '' : '，可在此放置物品' }}
    </div>

    <div
      v-for="loc in currentList"
      :key="loc.id"
      class="picker__row"
      :class="{ 'is-branch': loc.childCount > 0 }"
      @click="loc.childCount > 0 ? enter(loc) : select(loc.id)"
    >
      <div class="picker__row-main">
        <span class="picker__row-name">{{ loc.name }}</span>
        <span class="picker__row-meta">{{ LocationTypeMap[loc.type].label }}</span>
        <span v-if="loc.childCount > 0" class="picker__badge">🗂 {{ loc.childCount }} 个子位置</span>
      </div>
      <button
        v-if="selectAny || loc.childCount === 0"
        type="button"
        class="picker__choose"
        :class="{ 'is-chosen': modelValue === loc.id }"
        @click.stop="select(loc.id)"
      >
        {{ modelValue === loc.id ? '已选择' : '选择' }}
      </button>
      <span v-if="loc.childCount > 0" class="picker__chevron" title="进入下一级">›</span>
    </div>

    <button type="button" class="picker__add" @click="openAddChild">
      ＋ {{ currentId ? '在此新建子位置' : '新建根位置' }}
    </button>

    <van-popup v-model:show="showAddChild" position="bottom" round class="picker-popup">
      <div class="picker-popup__inner">
        <h3 class="picker-popup__title">{{ currentId ? '新建子位置' : '新建根位置' }}</h3>
        <van-field
          v-model="addForm.name"
          label="名称"
          placeholder="如 纸箱A / 小袋子 / 第二层"
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
                :class="{ 'is-active': addForm.type === key }"
                @click="addForm.type = key"
              >
                {{ info.label }}
              </button>
            </div>
          </template>
        </van-field>
        <div class="picker-popup__actions">
          <van-button plain type="primary" @click="showAddChild = false">取消</van-button>
          <van-button type="primary" @click="saveAddChild">保存</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { showToast } from 'vant'
import { LocationTypeMap } from '@/constants/enums'
import { useLocationStore } from '@/stores/location'
import { buildPath } from '@/services/pathService'
import type { LocationNode } from '@/types'

const props = withDefaults(
  defineProps<{ modelValue: string | null; excludeIds?: string[]; selectAny?: boolean }>(),
  { excludeIds: () => [], selectAny: false }
)
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()

const locationStore = useLocationStore()

const showAddChild = ref(false)
const addForm = reactive<{ name: string; type: LocationNode['type'] }>({ name: '', type: 'BOX' })

function openAddChild(): void {
  Object.assign(addForm, { name: '', type: 'BOX' })
  showAddChild.value = true
}

async function saveAddChild(): Promise<void> {
  const name = addForm.name.trim()
  if (!name) {
    showToast('请填写名称')
    return
  }
  if (currentList.value.some((l) => l.name === name)) {
    showToast('该层级下已有同名位置')
    return
  }
  const id = await locationStore.add({
    parentId: currentId.value,
    name,
    type: addForm.type
  })
  showAddChild.value = false
  emit('update:modelValue', id)
  showToast('已创建并选中')
}

const backIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>'

const trail = ref<LocationNode[]>([])
const currentId = ref<string | null>(null)

const currentList = computed(() =>
  locationStore
    .childrenOf(currentId.value)
    .filter((l) => !(props.excludeIds ?? []).includes(l.id))
    .map((l) => ({ ...l, childCount: locationStore.childrenOf(l.id).length }))
)

const selectedPath = computed(() =>
  props.modelValue ? buildPath(props.modelValue, locationStore.locations) : []
)

function enter(loc: LocationNode): void {
  trail.value.push(loc)
  currentId.value = loc.id
}

function goUp(): void {
  trail.value.pop()
  currentId.value = trail.value.length ? trail.value[trail.value.length - 1].id : null
}

function select(id: string): void {
  emit('update:modelValue', id)
}

watch(
  () => props.modelValue,
  (val) => {
    if (!val) return
    const node = locationStore.getById(val)
    if (node && trail.value.every((t) => t.id !== node.id)) {
      const chain: LocationNode[] = []
      let cur: LocationNode | undefined = node
      let guard = 0
      while (cur?.parentId && guard < 50) {
        const parent = locationStore.getById(cur.parentId)
        if (!parent) break
        chain.unshift(parent)
        cur = parent
        guard++
      }
      trail.value = chain
      currentId.value = node.id
    }
  }
)
</script>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.picker__selected {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: var(--radius-m);
  background: var(--color-accent-soft);
}

.picker__selected-label {
  font-size: 12px;
  color: var(--color-accent-deep);
}

.picker__selected-path {
  font-weight: 600;
  color: var(--color-ink);
}

.picker__trail {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.picker__back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: none;
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;
}

.picker__back-icon {
  width: 16px;
  height: 16px;
}

.picker__back-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.picker__trail-text {
  color: var(--color-ink-soft);
}

.picker__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 11px 12px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-m);
  background: var(--color-surface);
  cursor: pointer;
}

.picker__row:active {
  background: var(--color-surface-2);
}

.picker__row-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  min-width: 0;
}

.picker__row-name {
  font-weight: 600;
}

.picker__row-meta {
  font-size: 12px;
  color: var(--color-muted);
  background: var(--color-surface-2);
  padding: 1px 8px;
  border-radius: var(--radius-pill);
}

.picker__row.is-branch {
  border-color: var(--color-accent-soft);
}

.picker__badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent-deep);
  background: var(--color-accent-soft);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

.picker__chevron {
  flex-shrink: 0;
  color: var(--color-accent);
  font-size: 20px;
  line-height: 1;
}

.picker__choose {
  flex-shrink: 0;
  border: 1px solid var(--color-accent);
  background: none;
  color: var(--color-accent);
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  cursor: pointer;
}

.picker__choose.is-chosen {
  background: var(--color-accent);
  color: #fff;
}

.picker__empty {
  padding: 18px 12px;
  text-align: center;
  color: var(--color-muted);
  font-size: 13px;
  border: 1px dashed var(--color-line);
  border-radius: var(--radius-m);
}

.picker__add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 2px;
  padding: 11px 12px;
  border: 1px dashed var(--color-accent);
  border-radius: var(--radius-m);
  background: var(--color-accent-soft);
  color: var(--color-accent-deep);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.picker-popup {
  max-height: 85dvh;
}

.picker-popup__inner {
  padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
}

.picker-popup__title {
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

.picker-popup__actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.picker-popup__actions .van-button {
  flex: 1;
}
</style>
