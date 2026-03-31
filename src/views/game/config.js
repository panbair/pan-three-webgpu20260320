export const shuffleArray = arr => {
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

export const getMusic = () => {
  let ary = []
  for (let i = 1; i <= 7; i++) {
    const url = `https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/${i}.mp3`
    ary.push(url)
  }
  ary = shuffleArray(ary)
  console.log(ary)
  return ary
}

export const getTexturePath = () => {
  const randomIndex = Math.floor(Math.random() * 75) + 1
  const url = `https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/game1/g-v2-${randomIndex}.png`

  return url
}

export const getBg = () => {
  const randomIndex = Math.floor(Math.random() * 5) + 1
  const url = `https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/quanjing-v5/h-v5-${randomIndex}.png`

  return url
}
