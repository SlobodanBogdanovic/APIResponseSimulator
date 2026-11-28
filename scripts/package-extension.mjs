import { Buffer } from 'node:buffer'
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(root, 'dist')
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const version = String(pkg.version ?? '')
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`package.json version must be semver. Got ${version || '(empty)'}.`)
}

const zipName = `api-response-simulator-${version}.zip`
const zipPath = path.join(root, zipName)

function crc32(buffer) {
  let crc = ~0
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return ~crc >>> 0
}

function u16(value) {
  const out = Buffer.alloc(2)
  out.writeUInt16LE(value)
  return out
}

function u32(value) {
  const out = Buffer.alloc(4)
  out.writeUInt32LE(value >>> 0)
  return out
}

function collect(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collect(full))
      continue
    }
    if (!entry.isFile()) continue
    if (entry.name.endsWith('.map')) continue
    if (entry.name === '.env' || entry.name.startsWith('.env.')) continue
    const rel = path.relative(distDir, full).split(path.sep).join('/')
    files.push({ rel, data: readFileSync(full) })
  }
  return files
}

const files = collect(distDir).sort((a, b) => a.rel.localeCompare(b.rel))
if (!files.some((file) => file.rel === 'manifest.json')) {
  throw new Error('dist/manifest.json is missing. The package script builds dist/ before it zips.')
}

const locals = []
const centrals = []
let offset = 0
for (const file of files) {
  const name = Buffer.from(file.rel)
  const crc = crc32(file.data)
  const local = Buffer.concat([
    u32(0x04034b50),
    u16(20),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(crc),
    u32(file.data.length),
    u32(file.data.length),
    u16(name.length),
    u16(0),
    name,
    file.data,
  ])
  locals.push(local)
  const central = Buffer.concat([
    u32(0x02014b50),
    u16(20),
    u16(20),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(crc),
    u32(file.data.length),
    u32(file.data.length),
    u16(name.length),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(offset),
    name,
  ])
  centrals.push(central)
  offset += local.length
}

const centralDir = Buffer.concat(centrals)
const end = Buffer.concat([
  u32(0x06054b50),
  u16(0),
  u16(0),
  u16(files.length),
  u16(files.length),
  u32(centralDir.length),
  u32(offset),
  u16(0),
])

rmSync(zipPath, { force: true })
writeFileSync(zipPath, Buffer.concat([...locals, centralDir, end]))
console.log(`${zipName} (${files.length} files, manifest.json at archive root)`)
