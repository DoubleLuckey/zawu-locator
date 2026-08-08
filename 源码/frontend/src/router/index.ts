import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  // 使用 Vite 的 base（/zawu-locator/），确保在 GitHub Pages 子路径下路由正确
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '首页', tab: true }
    },
    {
      path: '/locations',
      name: 'locations',
      component: () => import('@/views/LocationListView.vue'),
      meta: { title: '位置', tab: true }
    },
    {
      path: '/locations/:locationId',
      name: 'location-detail',
      component: () => import('@/views/LocationDetailView.vue'),
      meta: { title: '位置详情' }
    },
    {
      path: '/items/:itemId',
      name: 'item-detail',
      component: () => import('@/views/ItemDetailView.vue'),
      meta: { title: '物品详情' }
    },
    {
      path: '/items/new',
      name: 'item-new',
      component: () => import('@/views/ItemEditView.vue'),
      meta: { title: '新增物品' }
    },
    {
      path: '/items/:itemId/edit',
      name: 'item-edit',
      component: () => import('@/views/ItemEditView.vue'),
      meta: { title: '编辑物品' }
    },
    {
      path: '/tags',
      name: 'tags',
      component: () => import('@/views/TagView.vue'),
      meta: { title: '标签', tab: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: '设置', tab: true }
    }
  ]
})

router.afterEach((to) => {
  const title = (to.meta.title as string) || '杂物定位'
  document.title = title
})

export default router
