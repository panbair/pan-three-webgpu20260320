/**
 * 可空类型
 */
export type Nullable<T> = T | null

/**
 * 可记录对象
 */
export type Recordable<T = any> = Record<string, T>

/**
 * 任意对象
 */
export type AnyObject = Record<string, unknown>

/**
 * 分页参数
 */
export interface PageParams {
  pageNo: number
  pageSize: number
}

/**
 * 分页结果
 */
export interface PageResult<T = any> {
  list: T[]
  total: number
  pageNo: number
  pageSize: number
}

/**
 * 响应结果
 */
export interface ResponseResult<T = any> {
  code: number
  message: string
  data: T
}

/**
 * 表格列配置
 */
export interface TableColumn {
  prop: string
  label: string
  width?: string | number
  minWidth?: string | number
  align?: 'left' | 'center' | 'right'
  fixed?: boolean | 'left' | 'right'
  sortable?: boolean
}
