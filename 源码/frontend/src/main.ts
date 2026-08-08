import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/index.css'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import { seedIfEmpty } from './services/seedService'
import { initOneDriveAuth } from './services/oneDriveService'
import { setAutoBackupEnabled, shouldWarnBeforeUnload } from './services/autoBackupService'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Vant)

seedIfEmpty()
void initOneDriveAuth().then((account) => {
  setAutoBackupEnabled(Boolean(account))
  // 整页跳转授权完成后回到应用首页，自动切回设置页
  if (account && router.currentRoute.value.path === '/') {
    void router.replace('/settings')
  }
})

// 有未同步到 OneDrive 的改动时，关闭页面前提醒
window.addEventListener('beforeunload', (e) => {
  if (shouldWarnBeforeUnload()) {
    e.preventDefault()
    e.returnValue = ''
  }
})

app.mount('#app')
