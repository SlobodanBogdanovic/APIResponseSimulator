import Jimp from 'jimp'
import { mkdirSync } from 'fs'

mkdirSync('./public/icons', { recursive: true })

const color = 0x4F46E5FF  // indigo

for (const size of [16, 48, 128]) {
  const img = new Jimp(size, size, color)
  await img.writeAsync(`./public/icons/icon${size}.png`)
  console.log(`Generated icon${size}.png`)
}
