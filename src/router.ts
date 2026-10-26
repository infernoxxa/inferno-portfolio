import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'

export function makeRouter(server = false) {
  return createRouter({
    history: server ? createMemoryHistory() : createWebHistory(),
    routes: [
      { path: '/', component: () => import('./views/HomeView.vue') },
      { path: '/projects/:id(personal-ai|cloud-sync)', component: () => import('./views/ProjectView.vue'), props: true },
      { path: '/ai/', component: () => import('./views/ComingSoonView.vue'), props: { id: 'personal-ai' } },
      { path: '/cloud/', component: () => import('./views/ComingSoonView.vue'), props: { id: 'cloud-sync' } },
      { path: '/resume', component: () => import('./views/ResumeView.vue') },
      { path: '/:pathMatch(.*)*', component: () => import('./views/NotFoundView.vue') },
    ],
    scrollBehavior(to, _from, savedPosition) {
      if (savedPosition) return savedPosition
      if (to.hash) return { el: to.hash, top: 100, behavior: 'instant' }
      return { top: 0 }
    },
  })
}
