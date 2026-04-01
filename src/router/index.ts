import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { AppRouteModule } from './types'

const routes: RouteRecordRaw[] = [
  /*  {
    path: '/',
    component: () => import('@/layout/index.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/Home/index.vue'),
        meta: { title: '首页' }
      }
    ]
  },*/
  {
    path: '/three-webgpu',
    name: 'three-webgpu',
    component: () => import('@/views/Home/index.vue'),
    meta: { title: 'three-webgpu' }
  },
  {
    path: '/test',
    name: 'Test',
    component: () => import('@/views/Test/index.vue'),
    meta: { title: '测试页面' }
  },
  {
    path: '/model',
    name: 'model',
    component: () => import('@/views/model/index.vue'),
    meta: { title: '模型页面' }
  },
  {
    path: '/game',
    name: 'game',
    component: () => import('@/views/game/index.vue'),
    meta: { title: '游戏' }
  },
  {
    path: '/',
    redirect: '/meteor-game'
  },
  {
    path: '/meteor-game',
    name: 'meteor-game',
    component: () => import('@/views/game/meteor-game.vue'),
    meta: { title: '陨石防御' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/Error/404.vue'),
    meta: { title: '404' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
