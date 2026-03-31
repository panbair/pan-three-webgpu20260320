/**
 * 随机打乱数组（Fisher-Yates洗牌算法）
 * @param {Array} arr - 需要打乱的数组
 * @returns {Array} - 打乱后的新数组（原数组不会被修改）
 */
export const shuffleArray = (arr) => {
  // 创建数组副本，避免修改原数组
  const shuffled = [...arr]

  // Fisher-Yates 洗牌算法
  for (let i = shuffled.length - 1; i > 0; i--) {
    // 生成 0 到 i 之间的随机索引
    const j = Math.floor(Math.random() * (i + 1))

    // 交换元素
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

/**
 * 原地打乱数组（会修改原数组）
 * @param {Array} arr - 需要打乱的数组
 * @returns {Array} - 打乱后的数组（返回原数组引用）
 */
export const shuffleArrayInPlace = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }

  return arr
}

/**
 * 从数组中随机抽取 n 个元素（不重复）
 * @param {Array} arr - 源数组
 * @param {number} n - 抽取数量
 * @returns {Array} - 随机抽取的元素数组
 */
export const sampleArray = (arr, n) => {
  const shuffled = shuffleArray(arr)
  return shuffled.slice(0, Math.min(n, arr.length))
}

/**
 * 从数组中随机抽取 1 个元素
 * @param {Array} arr - 源数组
 * @returns {*} - 随机抽取的元素
 */
export const sampleOne = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)]
}
