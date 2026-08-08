import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // GitHub Pages 项目站点子路径（https://<user>.github.io/zawu-locator/）
  base: '/zawu-locator/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '杂物定位',
        short_name: '杂物定位',
        description: '个人杂物收纳位置管理工具',
        lang: 'zh-CN',
        theme_color: '#e0612d',
        background_color: '#f6f1e5',
        display: 'standalone',
        // 相对路径，确保在 GitHub Pages 子路径下也能正确解析
        start_url: './',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'pwa/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true,
    // 本机 Hyper-V/WSL 预留了 5141-5240 等端口段（5173 在其中），改用 10086
    port: 10086
  }
})
