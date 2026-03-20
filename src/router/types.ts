import type { RouteRecordRaw } from 'vue-router'

export interface AppRouteModule extends RouteRecordRaw {
  meta?: {
    title?: string
    icon?: string
    hidden?: boolean
    keepAlive?: boolean
    roles?: string[]
  }
}
