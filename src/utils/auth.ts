const TOKEN_KEY = 'ACCESS_TOKEN'

/**
 * 获取 Token
 */
export function getToken(): string {
  // 优先从 cookie 获取（更安全）
  const cookies = document.cookie.split(';')
  const tokenCookie = cookies.find((c) => c.trim().startsWith(`${TOKEN_KEY}=`))
  if (tokenCookie) {
    return tokenCookie.split('=')[1]
  }
  // 回退到 sessionStorage
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

/**
 * 设置 Token
 */
export function setToken(token: string): void {
  // 使用 sessionStorage 存储（比 localStorage 更安全）
  sessionStorage.setItem(TOKEN_KEY, token)
  // 同时设置 cookie（可选）
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=86400`
}

/**
 * 删除 Token
 */
export function removeToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`
}
