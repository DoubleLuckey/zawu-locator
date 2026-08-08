<template>
  <div class="page">
    <button class="back-btn" type="button" @click="router.back()">
      <span v-html="backIcon"></span> 返回
    </button>

    <template v-if="item">
      <div class="item-hero card">
        <div class="item-hero__photo">
          <img v-if="photoUrl" :src="photoUrl" alt="" />
          <span v-else class="item-hero__emoji">📦</span>
        </div>
        <div class="item-hero__info">
          <h1 class="item-hero__name">{{ item.name }}</h1>
          <span class="badge" :class="`badge--${item.status.toLowerCase()}`">
            {{ ItemStatusMap[item.status].label }}
          </span>
        </div>
      </div>

      <div class="group card">
        <div class="group__title">基本信息</div>
        <div class="group__row"><span>别名</span><b>{{ item.aliases || '-' }}</b></div>
        <div class="group__row">
          <span>数量</span>
          <b>{{ item.quantity }}{{ item.unit || '件' }}</b>
        </div>
      </div>

      <div class="group card">
        <div class="group__title">
          位置信息
          <button class="link-btn" type="button" @click="copyPath">复制位置</button>
        </div>
        <div class="group__path">{{ pathText }}</div>
      </div>

      <div class="group card">
        <div class="group__title">标签</div>
        <div class="group__tags">
          <span
            v-for="tag in tagNames"
            :key="tag.id"
            class="tag-chip"
            :style="{ background: TagColorMap[tag.color].hex + '22', color: TagColorMap[tag.color].hex }"
          >
            {{ tag.name }}
          </span>
          <span v-if="!tagNames.length" class="group__empty">无标签</span>
        </div>
      </div>

      <div v-if="item.status === 'BORROWED'" class="group card">
        <div class="group__title">借出信息</div>
        <div class="group__row"><span>借出人</span><b>{{ item.borrower || '-' }}</b></div>
        <div class="group__row"><span>借出时间</span><b>{{ formatDate(item.borrowedAt) }}</b></div>
      </div>

      <div class="group card">
        <div class="group__title">备注</div>
        <p class="group__remark">{{ item.remark || '无' }}</p>
      </div>

      <div class="group card">
        <div class="group__title">记录</div>
        <div class="group__row"><span>创建时间</span><b>{{ formatDateTime(item.createdAt) }}</b></div>
        <div class="group__row"><span>更新时间</span><b>{{ formatDateTime(item.updatedAt) }}</b></div>
      </div>

      <div class="actions">
        <van-button size="small" plain type="primary" @click="router.push(`/items/${item.id}/edit`)">
          编辑
        </van-button>
        <van-button size="small" plain @click="showMove = true">移动</van-button>
        <template v-if="item.status === 'IN_STOCK'">
          <van-button size="small" plain type="warning" @click="openBorrow">标记借出</van-button>
        </template>
        <template v-else-if="item.status === 'BORROWED'">
          <van-button size="small" plain type="success" @click="returnItem">标记归还</van-button>
        </template>
        <van-button
          v-if="item.status !== 'DISCARDED'"
          size="small"
          plain
          type="danger"
          @click="discardItem"
        >
          丢弃
        </van-button>
        <van-button v-else size="small" plain type="success" @click="restoreItem">恢复</van-button>
        <van-button size="small" plain type="danger" @click="removeItem">删除</van-button>
      </div>
    </template>

    <EmptyState v-else icon="❓" text="物品不存在或已被删除" />

    <van-dialog
      v-model:show="showBorrow"
      title="标记借出"
      show-cancel-button
      @confirm="confirmBorrow"
    >
      <div class="borrow-form">
        <van-field v-model="borrowForm.borrower" label="借出人" placeholder="必填" />
        <van-field v-model="borrowForm.dueBackAt" label="应还日期" placeholder="可选，如 2026-08-20" />
      </div>
    </van-dialog>

    <van-popup v-model:show="showMove" position="bottom" round class="form-popup">
      <div class="form-popup__inner">
        <h3 class="form-popup__title">移动到新位置</h3>
        <LocationPicker v-model="moveTarget" />
        <div class="form-popup__actions">
          <van-button plain type="primary" @click="showMove = false">取消</van-button>
          <van-button type="primary" :disabled="!moveTarget" @click="confirmMove">移动</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import EmptyState from '@/components/EmptyState.vue'
import LocationPicker from '@/components/LocationPicker.vue'
import { ItemStatusMap, TagColorMap } from '@/constants/enums'
import { useItemStore } from '@/stores/item'
import { useLocationStore } from '@/stores/location'
import { useTagStore } from '@/stores/tag'
import { buildPath } from '@/services/pathService'
import { formatDate, formatDateTime } from '@/utils/date'

const route = useRoute()
const router = useRouter()
const itemStore = useItemStore()
const locationStore = useLocationStore()
const tagStore = useTagStore()

const itemId = computed(() => route.params.itemId as string)
const item = computed(() => itemStore.getById(itemId.value))

const showBorrow = ref(false)
const showMove = ref(false)
const moveTarget = ref<string | null>(null)
const borrowForm = reactive({ borrower: '', dueBackAt: '' })

const backIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>'

onMounted(async () => {
  await Promise.all([itemStore.load(), locationStore.load(), tagStore.load()])
  if (item.value) moveTarget.value = item.value.locationId
})

const pathText = computed(() =>
  item.value ? buildPath(item.value.locationId, locationStore.locations).join(' / ') : ''
)

const tagNames = computed(() => {
  if (!item.value) return []
  const ids = tagStore.itemTagMap[item.value.id] ?? []
  return ids.map((id) => tagStore.getById(id)).filter((t) => !!t)
})

const photoUrl = ref<string | null>(null)
let objectUrl: string | null = null

watch(
  () => item.value?.photoBlob,
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

async function copyPath(): Promise<void> {
  if (!pathText.value) return
  try {
    await navigator.clipboard.writeText(pathText.value)
    showToast('位置已复制')
  } catch {
    showToast('复制失败，请手动选择文本')
  }
}

function openBorrow(): void {
  borrowForm.borrower = ''
  borrowForm.dueBackAt = ''
  showBorrow.value = true
}

async function confirmBorrow(): Promise<void> {
  if (!borrowForm.borrower.trim()) {
    showToast('请填写借出人')
    return
  }
  if (!item.value) return
  await itemStore.update(item.value.id, {
    status: 'BORROWED',
    borrower: borrowForm.borrower.trim(),
    borrowedAt: Date.now(),
    dueBackAt: borrowForm.dueBackAt ? new Date(borrowForm.dueBackAt).getTime() : undefined
  })
  showToast('已标记借出')
}

async function returnItem(): Promise<void> {
  if (!item.value) return
  await itemStore.update(item.value.id, {
    status: 'IN_STOCK',
    borrower: undefined,
    borrowedAt: undefined,
    dueBackAt: undefined
  })
  showToast('已归还')
}

async function discardItem(): Promise<void> {
  if (!item.value) return
  await showConfirmDialog({ title: '丢弃物品', message: `确定将「${item.value.name}」标记为已丢弃吗？` })
  await itemStore.update(item.value.id, { status: 'DISCARDED' })
  showToast('已标记丢弃')
}

async function restoreItem(): Promise<void> {
  if (!item.value) return
  await itemStore.update(item.value.id, { status: 'IN_STOCK' })
  showToast('已恢复在库')
}

async function confirmMove(): Promise<void> {
  if (!item.value || !moveTarget.value) return
  await itemStore.move(item.value.id, moveTarget.value)
  showMove.value = false
  showToast('已移动')
}

async function removeItem(): Promise<void> {
  if (!item.value) return
  await showConfirmDialog({
    title: '删除物品',
    message: `确定删除「${item.value.name}」吗？删除后不可恢复。`
  })
  await itemStore.remove(item.value.id)
  showToast('已删除')
  router.replace('/locations')
}
</script>

<style scoped>
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: none;
  color: var(--color-ink-soft);
  font-size: 14px;
  padding: 6px 0;
  cursor: pointer;
}

.back-btn span {
  width: 18px;
  height: 18px;
}

.back-btn :deep(svg) {
  width: 100%;
  height: 100%;
}

.item-hero {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px;
  margin-top: 8px;
}

.item-hero__photo {
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-m);
  background: var(--color-surface-2);
  overflow: hidden;
}

.item-hero__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-hero__emoji {
  font-size: 40px;
}

.item-hero__info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-hero__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 22px;
}

.group {
  margin-top: 12px;
  padding: 14px 16px;
}

.group__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  letter-spacing: 2px;
  color: var(--color-muted);
  margin-bottom: 10px;
}

.group__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 0;
  font-size: 14px;
}

.group__row span {
  color: var(--color-muted);
}

.group__row b {
  font-weight: 600;
  text-align: right;
}

.group__path {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.7;
}

.group__tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-chip {
  font-size: 13px;
  padding: 3px 12px;
  border-radius: var(--radius-pill);
}

.group__empty {
  color: var(--color-muted);
  font-size: 13px;
}

.group__remark {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
}

.link-btn {
  border: none;
  background: none;
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}

.borrow-form {
  padding: 4px 8px 16px;
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

.form-popup__actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.form-popup__actions .van-button {
  flex: 1;
}
</style>
