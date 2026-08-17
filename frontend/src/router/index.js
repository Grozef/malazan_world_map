import { createRouter, createWebHashHistory } from 'vue-router'
import WorldPage from '../pages/WorldPage.vue'
import RegionPage from '../pages/RegionPage.vue'

// Hash history : le build statique se sert sous Laragon/Apache sans rewrite.
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    // Le globe est la vue d'accueil ; la carte plate passe sur /carte (le picker
    // d'authoring vit donc desormais sur #/carte?pick=1). Les routes NOMMEES ne
    // changent pas : tous les liens internes suivent sans retouche.
    // Lazy : three.js reste hors du chunk d'entree, utile aux deep-links region.
    { path: '/', name: 'globe', component: () => import('../pages/GlobePage.vue') },
    { path: '/carte', name: 'world', component: WorldPage },
    { path: '/region/:id', name: 'region', component: RegionPage },
  ],
})
