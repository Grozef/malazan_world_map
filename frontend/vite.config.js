import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base './' : le build reste servable depuis un sous-dossier Laragon sans rewrite
export default defineConfig({
  base: './',
  plugins: [vue()],
})
