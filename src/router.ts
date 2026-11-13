import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'

export function makeRouter(server = false) {
  const router = createRouter({
    history: server ? createMemoryHistory() : createWebHistory(),
    routes: [
      { path: '/', component: () => import('./views/HomeView.vue') },
      { path: '/blog', component: () => import('./views/BlogView.vue') },
      { path: '/blog/:slug', component: () => import('./views/ArticleView.vue'), props: true },
      { path: '/manage', component: () => import('./views/ArticleManagerView.vue') },
      { path: '/projects', component: () => import('./views/ProjectsView.vue') },
      { path: '/projects/:id(personal-ai|cloud-sync)', component: () => import('./views/ProjectView.vue'), props: true },
      { path: '/about', component: () => import('./views/AboutView.vue') },
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
  const legacy: Record<string, string> = { '#projects': '/projects', '#skills': '/about#skills', '#about': '/about', '#contact': '/resume#contact' }
  router.beforeEach(to => {
    if (to.path === '/' && legacy[to.hash]) return { path: legacy[to.hash]!.split('#')[0], hash: legacy[to.hash]!.includes('#') ? '#' + legacy[to.hash]!.split('#')[1] : '', replace: true }
  })
  return router
}
