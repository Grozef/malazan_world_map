import { createRouter, createWebHashHistory } from 'vue-router'
import WorldPage from '../pages/WorldPage.vue'
import RegionPage from '../pages/RegionPage.vue'

// Hash history : le build statique se sert sous Laragon/Apache sans rewrite.
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'world', component: WorldPage },
    { path: '/region/:id', name: 'region', component: RegionPage },
  ],
})
