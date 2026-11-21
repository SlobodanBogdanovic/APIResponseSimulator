import Jimp from 'jimp'
import { mkdirSync } from 'fs'

mkdirSync('./public/icons', { recursive: true })

const signal = 0x0B5F4EFF
const white = 0xFFFFFFFF

const bars = [
  { x: 3, y: 4, w: 10, h: 2 },
  { x: 3, y: 8, w: 7, h: 2 },
  { x: 3, y: 11, w: 4, h: 2 },
]

for (const size of [16, 48, 128]) {
  const scale = size / 16
  const img = new Jimp(size, size, signal)
  for (const bar of bars) {
    const x0 = bar.x * scale
    const y0 = bar.y * scale
    const w = bar.w * scale
    const h = bar.h * scale
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        img.setPixelColor(white, x, y)
      }
    }
  }
  await img.writeAsync(`./public/icons/icon${size}.png`)
  console.log(`Generated icon${size}.png`)
}
