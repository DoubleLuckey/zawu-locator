<template>
  <div class="page">
    <button class="back-btn" type="button" @click="router.back()">
      <span v-html="backIcon"></span> 返回
    </button>
    <h1 class="page-title">{{ isEdit ? '编辑物品' : '新增物品' }}</h1>

    <div class="form card">
      <van-field
        v-model="form.name"
        label="名称"
        required
        placeholder="物品名称，如 螺丝刀套装"
        maxlength="40"
      />
      <van-field
        v-model="form.aliases"
        label="别名"
        placeholder="逗号分隔，如 改锥、螺丝刀"
      />
      <van-field label="数量">
        <template #input>
          <div class="qty-row">
            <van-stepper v-model="form.quantity" min="1" integer />
            <input v-model="form.unit" class="unit-input" placeholder="单位（件/个/套）" maxlength="8" />
          </div>
        </template>
      </van-field>
      <van-field label="照片">
        <template #input>
          <van-uploader v-model="fileList" :max-count="1" :after-read="onAfterRead" />
        </template>
      </van-field>
      <van-field label="备注">
        <template #input>
          <textarea
            v-model="form.remark"
            class="remark-input"
            rows="2"
            placeholder="可选"
          ></textarea>
        </template>
      </van-field>
    </div>

    <div class="section-label">存放位置</div>
    <div class="card picker-wrap">
      <LocationPicker v-model="form.locationId" />
    </div>

    <div class="section-label">标签</div>
    <div class="card tag-pick">
      <button
        v-for="tag in tagStore.tags"
        :key="tag.id"
        type="button"
        class="tag-pick__item"
        :class="{ 'is-active': selectedTags.includes(tag.id) }"
        :style="{ borderColor: TagColorMap[tag.color].hex }"
        @click="toggleTag(tag.id)"
      >
        <span
          class="tag-pick__dot"
          :style="{ background: TagColorMap[tag.color].hex }"
        ></span>
        {{ tag.name }}
      </button>
      <span v-if="!tagStore.tags.length" class="tag-pick__empty">暂无标签，可到「标签」页创建</span>
    </div>

    <div class="save-row">
      <van-button block type="primary" round @click="save">保存</van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import type { UploaderFileListItem } from 'vant'
import LocationPicker from '@/components/LocationPicker.vue'
import { TagColorMap } from '@/constants/enums'
import { compressToBlob } from '@/services/imageService'
import { useItemStore } from '@/stores/item'
import { useLocationStore } from '@/stores/location'
import { useTagStore } from '@/stores/tag'

const route = useRoute()
const router = useRouter()
const itemStore = useItemStore()
const locationStore = useLocationStore()
const tagStore = useTagStore()

const isEdit = computed(() => !!route.params.itemId)
const itemId = computed(() => route.params.itemId as string | undefined)

const form = reactive({
  name: '',
  aliases: '',
  quantity: 1,
  unit: '',
  remark: '',
  locationId: (route.query.locationId as string) || null
})

const fileList = ref<{ url?: string }[]>([])
const selectedTags = ref<string[]>([])

const backIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>'

onMounted(async () => {
  await Promise.all([itemStore.load(), locationStore.load(), tagStore.load()])
  if (isEdit.value && itemId.value) {
    const item = itemStore.getById(itemId.value)
    if (item) {
      form.name = item.name
      form.aliases = item.aliases ?? ''
      form.quantity = item.quantity
      form.unit = item.unit ?? ''
      form.remark = item.remark ?? ''
      form.locationId = item.locationId
      selectedTags.value = tagStore.itemTagMap[item.id] ?? []
      if (item.photoBlob) {
        fileList.value = [{ url: URL.createObjectURL(item.photoBlob) }]
      }
    }
  }
})

async function onAfterRead(fileItems: UploaderFileListItem | UploaderFileListItem[]): Promise<void> {
  const item = Array.isArray(fileItems) ? fileItems[0] : fileItems
  if (!item?.file) return
  const blob = await compressToBlob(item.file)
  if (fileList.value[0]?.url) URL.revokeObjectURL(fileList.value[0].url)
  fileList.value = [{ url: URL.createObjectURL(blob) }]
}

function toggleTag(tagId: string): void {
  const idx = selectedTags.value.indexOf(tagId)
  if (idx >= 0) selectedTags.value.splice(idx, 1)
  else selectedTags.value.push(tagId)
}

async function save(): Promise<void> {
  if (!form.name.trim()) {
    showToast('请填写物品名称')
    return
  }
  if (!form.locationId) {
    showToast('请选择存放位置')
    return
  }

  const payload = {
    name: form.name.trim(),
    aliases: form.aliases.trim() || undefined,
    quantity: form.quantity,
    unit: form.unit.trim() || undefined,
    remark: form.remark.trim() || undefined,
    locationId: form.locationId,
    photoBlob: fileList.value.length ? await blobOfCurrentFile() : undefined
  }

  if (isEdit.value && itemId.value) {
    await itemStore.update(itemId.value, payload)
    await tagStore.setItemTags(itemId.value, selectedTags.value)
    showToast('已保存')
    router.back()
  } else {
    const id = await itemStore.add({
      ...payload,
      status: 'IN_STOCK'
    })
    await tagStore.setItemTags(id, selectedTags.value)
    showToast('物品已入库')
    router.replace(`/items/${id}`)
  }
}

async function blobOfCurrentFile(): Promise<Blob | null> {
  if (!fileList.value.length) return null
  if (isEdit.value && itemId.value) {
    const cur = itemStore.getById(itemId.value)
    if (cur?.photoBlob && fileList.value[0].url?.startsWith('blob:')) {
      // 编辑且未更换图片时保持原图
    }
  }
  const url = fileList.value[0].url
  if (!url) return null
  const res = await fetch(url)
  return res.blob()
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

.form {
  margin-top: 8px;
}

.qty-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.unit-input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-s);
  padding: 7px 10px;
  font-size: 14px;
  outline: none;
  background: var(--color-surface);
}

.remark-input {
  width: 100%;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-s);
  padding: 8px 10px;
  font-size: 14px;
  outline: none;
  resize: vertical;
  background: var(--color-surface);
}

.picker-wrap {
  padding: 12px;
}

.tag-pick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
}

.tag-pick__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  font-size: 13px;
  cursor: pointer;
}

.tag-pick__item.is-active {
  background: var(--color-surface-2);
  font-weight: 600;
}

.tag-pick__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.tag-pick__empty {
  font-size: 13px;
  color: var(--color-muted);
}

.save-row {
  margin: 24px 0;
}
</style>
