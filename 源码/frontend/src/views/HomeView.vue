<template>
  <div class="page home">
    <header class="home__hero">
      <h1 class="home__title">杂物定位</h1>
      <p class="home__subtitle">大包套小包，一搜就知道</p>
      <IntroGuide />
    </header>

    <div class="searchbar">
      <span class="searchbar__icon" v-html="searchIcon"></span>
      <input
        v-model.trim="keyword"
        class="searchbar__input"
        type="search"
        placeholder="搜索物品名称、别名、标签、位置"
        @input="onInput"
      />
      <button v-if="keyword" class="searchbar__clear" type="button" @click="clearKeyword">×</button>
    </div>

    <template v-if="!keyword">
      <div class="quick">
        <button class="quick__item tap" type="button" @click="goAll">
          <span class="quick__num">{{ itemStore.items.length }}</span>
          <span class="quick__label">全部物品</span>
        </button>
        <button class="quick__item tap" type="button" @click="goRecent">
          <span class="quick__num">{{ searchStore.recentItems.length }}</span>
          <span class="quick__label">最近添加</span>
        </button>
        <button class="quick__item tap" type="button" @click="goBorrowed">
          <span class="quick__num">{{ itemStore.countByStatus('BORROWED') }}</span>
          <span class="quick__label">借出中</span>
        </button>
      </div>

      <div v-if="searchStore.history.length" class="home__block">
        <div class="section-label">
          搜索历史
          <button class="link-btn" type="button" @click="clearHistory">清空</button>
        </div>
        <div class="chips">
          <button
            v-for="kw in searchStore.history"
            :key="kw"
            class="chip tap"
            type="button"
            @click="applyKeyword(kw)"
          >
            {{ kw }}
          </button>
        </div>
      </div>

      <div class="home__block">
        <div class="section-label">最近添加</div>
        <div class="home__list">
          <ItemCard
            v-for="(it, i) in searchStore.recentItems"
            :key="it.id"
            :item="it"
            :path="pathText(it.locationId)"
            class="fade-up"
            :style="{ animationDelay: `${i * 40}ms` }"
            @click="goItem(it.id)"
          />
        </div>
        <EmptyState v-if="!searchStore.recentItems.length" text="还没有物品，点右下角新增" />
      </div>
    </template>

    <template v-else>
      <div class="section-label">搜索结果 · {{ searchStore.results.length }} 条</div>
      <div class="home__list">
        <div
          v-for="r in searchStore.results"
          :key="r.item.id"
          class="result fade-up"
          @click="goItem(r.item.id)"
        >
          <ItemCard :item="r.item" :path="r.path" />
          <span class="result__hit">命中：{{ r.matchedField }}</span>
        </div>
      </div>
      <EmptyState
        v-if="!searchStore.results.length"
        icon="🔍"
        text="未找到，可试试别名或标签关键词"
      />
    </template>

    <FabButton label="新增" @click="showActions = true" />

    <van-action-sheet
      v-model:show="showActions"
      :actions="fabActions"
      cancel-text="取消"
      @select="onFabSelect"
    />

    <van-popup v-model:show="showLocForm" position="bottom" round class="form-popup">
      <div class="form-popup__inner">
        <h3 class="form-popup__title">新增位置</h3>
        <van-field
          v-model="locForm.name"
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
                :class="{ 'is-active': locForm.type === key }"
                @click="locForm.type = key"
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
                :class="{ 'is-active': locForm.icon === key }"
                @click="locForm.icon = key"
              >
                {{ iconEmojiByIcon(key) }}
              </button>
            </div>
          </template>
        </van-field>
        <van-field v-model="locForm.description" label="描述" placeholder="可选，如'进门左侧'" />

        <div class="section-label loc-parent-label">所属位置（可选）</div>
        <div class="card picker-wrap">
          <LocationPicker v-model="locForm.parentId" select-any />
        </div>
        <p class="loc-parent-hint">不选择则创建为根位置（如 卧室、储物间）</p>
        <div v-if="locForm.parentId" class="loc-parent-reset">
          <van-button size="small" plain type="primary" @click="locForm.parentId = null">
            改为根位置
          </van-button>
        </div>

        <div class="form-popup__actions">
          <van-button plain type="primary" @click="showLocForm = false">取消</van-button>
          <van-button type="primary" @click="saveLocation">保存</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import LocationPicker from '@/components/LocationPicker.vue'
import ItemCard from '@/components/ItemCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import FabButton from '@/components/FabButton.vue'
import IntroGuide from '@/components/IntroGuide.vue'
import { LocationTypeMap, SpaceIconMap } from '@/constants/enums'
import { useItemStore } from '@/stores/item'
import { useLocationStore } from '@/stores/location'
import { useTagStore } from '@/stores/tag'
import { useSearchStore } from '@/stores/search'
import { buildPathText } from '@/services/pathService'
import type { LocationNode, SpaceIcon } from '@/types'

const router = useRouter()
const itemStore = useItemStore()
const locationStore = useLocationStore()
const tagStore = useTagStore()
const searchStore = useSearchStore()

const keyword = ref('')
let timer: ReturnType<typeof setTimeout> | null = null

const showActions = ref(false)
const showLocForm = ref(false)
const fabActions = [
  { name: '新增物品', value: 'item' },
  { name: '新增位置', value: 'location' }
]
const locForm = reactive<{
  name: string
  type: LocationNode['type']
  icon: SpaceIcon
  description: string
  parentId: string | null
}>({ name: '', type: 'ROOM', icon: 'OTHER', description: '', parentId: null })

const searchIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>'

onMounted(async () => {
  await Promise.all([
    locationStore.load(),
    itemStore.load(),
    tagStore.load(),
    searchStore.loadHistory(),
    searchStore.loadRecent()
  ])
})

function onInput(): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(async () => {
    await searchStore.run(keyword.value)
    await searchStore.loadRecent()
  }, 300)
}

function clearKeyword(): void {
  keyword.value = ''
  searchStore.results = []
}

function applyKeyword(kw: string): void {
  keyword.value = kw
  searchStore.run(kw)
}

function pathText(locationId: string): string {
  return buildPathText(locationId, locationStore.locations)
}

function goItem(id: string): void {
  router.push(`/items/${id}`)
}

function goAll(): void {
  router.push('/locations')
}

function goRecent(): void {
  if (!searchStore.recentItems.length) {
    showToast('还没有最近添加的物品')
    return
  }
  router.push('/locations')
}

function goBorrowed(): void {
  const count = itemStore.countByStatus('BORROWED')
  if (!count) showToast('当前没有借出中的物品')
  else showToast(`有 ${count} 件物品借出中，可到对应位置查看`)
}

function onFabSelect(action: { value: string }): void {
  showActions.value = false
  if (action.value === 'item') {
    router.push('/items/new')
  } else if (action.value === 'location') {
    Object.assign(locForm, {
      name: '',
      type: 'ROOM',
      icon: 'OTHER',
      description: '',
      parentId: null
    })
    showLocForm.value = true
  }
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

async function saveLocation(): Promise<void> {
  const name = locForm.name.trim()
  if (!name) {
    showToast('请填写名称')
    return
  }
  const id = await locationStore.add({
    parentId: locForm.parentId,
    name,
    type: locForm.type,
    icon: locForm.icon,
    description: locForm.description.trim() || undefined
  })
  showLocForm.value = false
  showToast('位置已创建')
  router.push(`/locations/${id}`)
}

async function clearHistory(): Promise<void> {
  await searchStore.clearHistory()
  showToast('搜索历史已清空')
}
</script>

<style scoped>
.home__hero {
  padding: 14px 2px 6px;
}

.home__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  letter-spacing: 3px;
}

.home__subtitle {
  margin: 4px 0 0;
  color: var(--color-muted);
  font-size: 13px;
  letter-spacing: 1px;
}

.searchbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
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
  color: var(--color-ink);
}

.searchbar__input::placeholder {
  color: var(--color-muted);
}

.searchbar__clear {
  border: none;
  background: var(--color-bg-deep);
  color: var(--color-ink-soft);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.quick {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 14px;
}

.quick__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 14px 8px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-m);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.quick__num {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--color-accent);
}

.quick__label {
  font-size: 12px;
  color: var(--color-ink-soft);
}

.home__block {
  margin-top: 6px;
}

.home__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  color: var(--color-ink-soft);
  padding: 5px 14px;
  border-radius: var(--radius-pill);
  font-size: 13px;
}

.link-btn {
  border: none;
  background: none;
  color: var(--color-muted);
  font-size: 12px;
  margin-left: auto;
  cursor: pointer;
}

.result {
  position: relative;
}

.result__hit {
  position: absolute;
  right: 10px;
  bottom: 8px;
  font-size: 11px;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  padding: 1px 8px;
  border-radius: var(--radius-pill);
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

.picker-wrap {
  padding: 12px;
}

.loc-parent-label {
  margin-top: 14px;
}

.loc-parent-hint {
  margin: 8px 2px 0;
  font-size: 12px;
  color: var(--color-muted);
}

.loc-parent-reset {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
