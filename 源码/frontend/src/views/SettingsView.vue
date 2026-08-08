<template>
  <div class="page">
    <h1 class="page-title">设置</h1>

    <div class="section-label">数据统计</div>
    <div class="stat card">
      <div class="stat__item">
        <b>{{ locationStore.locations.length }}</b>
        <span>位置</span>
      </div>
      <div class="stat__item">
        <b>{{ itemStore.items.length }}</b>
        <span>物品</span>
      </div>
      <div class="stat__item">
        <b>{{ tagStore.tags.length }}</b>
        <span>标签</span>
      </div>
      <div class="stat__item">
        <b>{{ storageText }}</b>
        <span>占用</span>
      </div>
    </div>

    <div class="section-label">数据备份</div>
    <div class="group card">
      <p class="group__desc">所有数据仅保存在本机浏览器中，请定期导出备份，防止换设备或清理浏览器时丢失。</p>
      <van-button block type="primary" @click="onExportJson">导出 JSON 备份（含照片）</van-button>
      <van-button block plain type="primary" style="margin-top: 10px" @click="onExportCsv">
        导出 CSV 物品清单
      </van-button>
      <van-button block plain style="margin-top: 10px" @click="downloadImportTemplate()">
        下载导入模板
      </van-button>
      <input
        ref="importFileInput"
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        @change="onImportExcelFile"
      />
      <van-button block plain type="primary" style="margin-top: 10px" @click="importFileInput?.click()">
        导入 Excel / CSV 物品清单（合并）
      </van-button>
      <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onImportFile" />
      <van-button block plain style="margin-top: 10px" @click="fileInput?.click()">
        导入 JSON 备份
      </van-button>
    </div>

    <div class="section-label">OneDrive 云备份</div>
    <div class="group card">
      <p class="group__desc">
        备份加密传输到你的 OneDrive 应用专属文件夹（Apps/杂物定位），登录后可在任意设备恢复，清理浏览器数据也不丢失。
      </p>
      <template v-if="!oneDriveConfigured">
        <p class="group__row"><span>配置状态</span><b>未配置</b></p>
        <p class="group__row hint">缺少 VITE_ONEDRIVE_CLIENT_ID，请查看 README「OneDrive 云备份」完成 Azure 应用注册。</p>
      </template>
      <template v-else>
        <div class="group__row">
          <span>账号状态</span>
          <b>{{ oneDriveLoggedIn ? oneDriveAccountName : '未登录' }}</b>
        </div>
        <div class="group__row">
          <span>上次自动备份</span>
          <b>{{ lastAutoBackupText }}</b>
        </div>
        <p class="group__desc" style="margin-bottom: 12px">
          登录后数据变更约 5 秒自动备份；有未同步改动时关闭页面会提醒。
        </p>
        <van-button
          block
          type="primary"
          :loading="oneDriveBusy"
          :disabled="!oneDriveLoggedIn"
          @click="onOneDriveBackup"
        >
          备份到 OneDrive
        </van-button>
        <van-button
          block
          plain
          style="margin-top: 10px"
          :loading="oneDriveBusy"
          :disabled="!oneDriveLoggedIn"
          @click="onOneDriveRestore"
        >
          从 OneDrive 恢复
        </van-button>
        <van-button
          v-if="!oneDriveLoggedIn"
          block
          plain
          style="margin-top: 10px"
          @click="onOneDriveLogin"
        >
          登录微软账号
        </van-button>
        <van-button v-else block plain style="margin-top: 10px" @click="onOneDriveLogout">
          退出登录
        </van-button>
      </template>
    </div>

    <div class="section-label">关于</div>
    <div class="group card">
      <div class="group__row"><span>名称</span><b>杂物定位</b></div>
      <div class="group__row">
        <span>版本</span>
        <b class="version-tap" @click="onVersionTap">v{{ APP_VERSION }}</b>
      </div>
      <div class="group__row"><span>存储</span><b>仅本机（IndexedDB）</b></div>
      <div class="group__row"><span>离线可用</span><b>支持（PWA）</b></div>
    </div>

    <van-action-sheet
      v-model:show="showBackupPicker"
      title="选择要恢复的备份"
      :actions="backupPickerActions"
      cancel-text="取消"
      @select="onPickBackup"
    />
    <van-dialog v-model:show="showImportResult" title="导入完成" confirm-button-text="知道了">
      <div class="import-result">
        <p>
          新增 {{ importResult?.added ?? 0 }} 条，更新 {{ importResult?.updated ?? 0 }} 条，跳过
          {{ importResult?.issues.length ?? 0 }} 条。
        </p>
        <ul v-if="visibleImportIssues.length">
          <li v-for="issue in visibleImportIssues" :key="`${issue.rowNumber}-${issue.reason}`">
            第 {{ issue.rowNumber }} 行：{{ issue.reason }}
          </li>
        </ul>
        <p v-if="(importResult?.issues.length ?? 0) > 10" class="import-result__more">
          ……等共 {{ importResult?.issues.length }} 条跳过原因
        </p>
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { exportCsv, exportJson, importJson } from '@/services/backupService'
import {
  downloadImportTemplate,
  importFromFile,
  type ImportResult
} from '@/services/importService'
import {
  backupToOneDrive,
  getOneDriveLoginState,
  initOneDriveAuth,
  isOneDriveConfigured,
  listOneDriveBackups,
  loginOneDrive,
  logoutOneDrive,
  restoreFromOneDrive
} from '@/services/oneDriveService'
import { getLastAutoBackupTime } from '@/services/autoBackupService'
import {
  formatBackupTime,
  formatFileSize,
  toUserMessage,
  type BackupFileInfo
} from '@/services/oneDriveHelpers'
import { APP_VERSION } from '@/constants/version'
import { clearAllData } from '@/services/resetService'
import { createTapCounter } from '@/utils/tapCounter'
import { useItemStore } from '@/stores/item'
import { useLocationStore } from '@/stores/location'
import { useTagStore } from '@/stores/tag'

const locationStore = useLocationStore()
const itemStore = useItemStore()
const tagStore = useTagStore()

const fileInput = ref<HTMLInputElement | null>(null)
const importFileInput = ref<HTMLInputElement | null>(null)
const importResult = ref<ImportResult | null>(null)
const showImportResult = ref(false)
const versionTaps = createTapCounter(5, 2000)
const storageText = ref('—')
const oneDriveConfigured = isOneDriveConfigured()
const oneDriveLoggedIn = ref(false)
const oneDriveAccountName = ref('')
const oneDriveBusy = ref(false)
const lastAutoBackupText = ref('—')
const showBackupPicker = ref(false)
const backupOptions = ref<BackupFileInfo[]>([])
const backupPickerActions = computed(() =>
  backupOptions.value.map((b) => ({
    name: b.name,
    subname: `${b.label} · ${formatFileSize(b.size)}`
  }))
)
const visibleImportIssues = computed(() => importResult.value?.issues.slice(0, 10) ?? [])

onMounted(async () => {
  await initOneDriveAuth()
  await refreshOneDriveState()
  refreshAutoBackupStatus()
  await Promise.all([locationStore.load(), itemStore.load(), tagStore.load()])
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate()
      const used = est.usage ?? 0
      storageText.value =
        used > 1024 * 1024 ? `${(used / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(used / 1024))} KB`
    }
  } catch {
    storageText.value = '—'
  }
})

async function refreshOneDriveState(): Promise<void> {
  const state = await getOneDriveLoginState()
  oneDriveLoggedIn.value = state.loggedIn
  oneDriveAccountName.value = state.account?.username ?? ''
}

function refreshAutoBackupStatus(): void {
  const t = getLastAutoBackupTime()
  lastAutoBackupText.value = t ? formatBackupTime(t) : '—'
}

async function onOneDriveLogin(): Promise<void> {
  // 整页跳转到微软登录，授权完成后自动回到应用
  await loginOneDrive()
}

async function onOneDriveLogout(): Promise<void> {
  // 整页跳转到微软退出登录，完成后回到应用
  await logoutOneDrive()
}

async function onOneDriveBackup(): Promise<void> {
  oneDriveBusy.value = true
  try {
    await backupToOneDrive()
    showToast('已备份到 OneDrive')
  } catch (e) {
    showToast(toUserMessage(e, '备份失败，请重试'))
  } finally {
    oneDriveBusy.value = false
  }
}

async function onOneDriveRestore(): Promise<void> {
  oneDriveBusy.value = true
  try {
    const backups = await listOneDriveBackups()
    if (backups.length === 0) {
      showToast('云端暂无备份')
      return
    }
    if (backups.length > 1) {
      backupOptions.value = backups
      showBackupPicker.value = true
      return
    }
    await confirmAndRestore(backups[0])
  } catch (e) {
    showToast(toUserMessage(e, '恢复失败，请重试'))
  } finally {
    oneDriveBusy.value = false
  }
}

async function onPickBackup(action: { name: string }): Promise<void> {
  showBackupPicker.value = false
  const chosen = backupOptions.value.find((b) => b.name === action.name)
  if (!chosen) return
  await confirmAndRestore(chosen)
}

async function confirmAndRestore(backup: BackupFileInfo): Promise<void> {
  oneDriveBusy.value = true
  try {
    await showConfirmDialog({
      title: '恢复备份',
      message: `将覆盖当前全部数据（${backup.name}），确定继续吗？`
    })
  } catch {
    return
  }
  try {
    const result = await restoreFromOneDrive(backup.name)
    if (result.ok) {
      await Promise.all([locationStore.load(), itemStore.load(), tagStore.load()])
      showToast(result.message)
    } else {
      showToast(result.message)
    }
  } catch (e) {
    showToast(toUserMessage(e, '恢复失败，请重试'))
  } finally {
    oneDriveBusy.value = false
  }
}

function onExportJson(): void {
  exportJson()
  showToast('备份已导出')
}

function onExportCsv(): void {
  exportCsv()
  showToast('清单已导出')
}

async function onImportFile(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    await showConfirmDialog({
      title: '导入备份',
      message: '导入将覆盖当前全部数据，确定继续吗？'
    })
  } catch {
    return
  }
  const result = await importJson(file)
  if (result.ok) {
    await Promise.all([locationStore.load(), itemStore.load(), tagStore.load()])
    showToast(result.message)
  } else {
    showToast(result.message)
  }
}

async function onImportExcelFile(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    await showConfirmDialog({
      title: '导入物品清单',
      message: '将按合并模式导入：已存在的位置和物品会更新，不删除现有数据与照片。确定继续吗？'
    })
  } catch {
    return
  }
  try {
    const result = await importFromFile(file)
    await Promise.all([locationStore.load(), itemStore.load(), tagStore.load()])
    importResult.value = result
    showImportResult.value = true
  } catch {
    showToast('导入失败，请检查文件内容')
  }
}

async function onVersionTap(): Promise<void> {
  if (!versionTaps.tap()) return
  try {
    await showConfirmDialog({
      title: '清空全部数据',
      message: '将删除本机全部位置、物品、标签、照片与搜索历史，且不会自动恢复演示数据。确定继续吗？',
      confirmButtonText: '清空',
      confirmButtonColor: '#c24b3d'
    })
  } catch {
    return
  }
  try {
    await clearAllData()
    showToast('数据已清空')
    window.location.reload()
  } catch {
    showToast('清空失败，请重试')
  }
}
</script>

<style scoped>
.stat {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 16px 8px;
}

.stat__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat__item b {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--color-accent);
}

.stat__item span {
  font-size: 12px;
  color: var(--color-muted);
}

.group {
  padding: 14px 16px;
}

.group__desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--color-ink-soft);
  line-height: 1.7;
}

.group__row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}

.group__row span {
  color: var(--color-muted);
}

.group__row b {
  font-weight: 600;
}

.group__row.hint {
  color: var(--color-muted);
  font-size: 12px;
  line-height: 1.6;
}

.import-result {
  padding: 0 20px 18px;
  font-size: 14px;
  color: var(--color-ink-soft);
  line-height: 1.8;
}

.import-result ul {
  margin: 8px 0;
  padding-left: 18px;
  max-height: 160px;
  overflow-y: auto;
}

.import-result__more {
  margin: 4px 0 0;
  color: var(--color-muted);
  font-size: 12px;
}

.version-tap {
  cursor: pointer;
  user-select: none;
}
</style>
