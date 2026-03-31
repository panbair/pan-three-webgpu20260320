export const getMusic = () => {
  let ary = []
  for (let i = 1; i < 8; i++) {
    const url = `https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/${i}.mp3`
    ary.push(url)
  }
  return ary
}

export const getTexturePath = () => {
  const randomIndex = Math.floor(Math.random() * 57) + 1
  const url = `https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/game/g-v1-${randomIndex}.png`

  return url
}

export const getBg = () => {
  const randomIndex = Math.floor(Math.random() * 5) + 1
  const url = `https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/quanjing-v5/h-v5-${randomIndex}.png`

  return url
}
