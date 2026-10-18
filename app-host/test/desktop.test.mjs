// 桌面版用到的宿主能力（不起 Harness）：凭据加密存取和迁移、用本机程序打开产出、导出日志。
// 运行：node --test app-host/test/desktop.test.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, test } from 'node:test'
import zlib from 'node:zlib'
import { AppHost } from '../host.mjs'
import { zip } from '../logs.mjs'

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-desktop-'))
after(() => fs.rmSync(scratch, { recursive: true, force: true }))

/** 测试用的“加密”：可逆、但存下来的内容里看不到原文 */
function fakeBox(file) {
  return {
    load: () => (fs.existsSync(file) ? JSON.parse(Buffer.from(fs.readFileSync(file, 'utf8'), 'base64').toString('utf8')) : undefined),
    save: value => fs.writeFileSync(file, Buffer.from(JSON.stringify(value)).toString('base64')),
  }
}

/** 读 zip：{ 文件名: Buffer } */
function unzip(buf) {
  const out = {}
  let i = 0
  while (buf.readUInt32LE(i) === 0x04034b50) {
    const size = buf.readUInt32LE(i + 18)
    const nameLen = buf.readUInt16LE(i + 26)
    const extra = buf.readUInt16LE(i + 28)
    const name = buf.subarray(i + 30, i + 30 + nameLen).toString('utf8')
    const start = i + 30 + nameLen + extra
    out[name] = zlib.inflateRawSync(buf.subarray(start, start + size))
    i = start + size
  }
  return out
}

test('zip：中文文件名、内容原样还原', () => {
  const files = unzip(zip([{ name: '日志/宿主.log', data: '第一行\n' }, { name: 'a.bin', data: Buffer.from([0, 1, 2, 255]) }]))
  assert.equal(files['日志/宿主.log'].toString('utf8'), '第一行\n')
  assert.deepEqual([...files['a.bin']], [0, 1, 2, 255])
})

test('凭据：传入 secretBox 时加密保存，旧的明文 secrets.json 迁移后删除', async () => {
  const dataDir = path.join(scratch, 'secrets')
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(path.join(dataDir, 'secrets.json'), JSON.stringify({ model: 'sk-old-plain-key' }))
  const box = fakeBox(path.join(dataDir, 'secrets.enc'))
  let host = new AppHost({ dataDir, python: 'python3', secretBox: box })
  assert.equal(host.store.secrets.model, 'sk-old-plain-key')
  assert.ok(!fs.existsSync(path.join(dataDir, 'secrets.json')))
  await host.dispatch('secret.save', { key: 'model', value: 'sk-new-key-123456' })
  assert.ok(!fs.readFileSync(path.join(dataDir, 'secrets.enc'), 'utf8').includes('sk-new-key'))
  await host.close()
  host = new AppHost({ dataDir, python: 'python3', secretBox: box })
  assert.equal(host.store.secrets.model, 'sk-new-key-123456')
  assert.equal((await host.dispatch('settings.get', {})).hasKey, true)
  await host.close()
})

test('output.open 交给本机程序打开；打开失败时报错', async () => {
  const dataDir = path.join(scratch, 'open')
  const folder = path.join(scratch, '项目一')
  fs.mkdirSync(path.join(folder, '输出'), { recursive: true })
  fs.writeFileSync(path.join(folder, '输出', '结果.xlsx'), 'x')
  const opened = []
  let fail = ''
  const host = new AppHost({ dataDir, python: 'python3', openPath: async (f) => (opened.push(f), fail) })
  const p = await host.dispatch('project.create', { name: '项目一', folder })
  host.store.state(p.project).outputs.push({ output: 'O-0001', file: '输出/结果.xlsx', name: '结果.xlsx', kind: 'table', at: new Date().toISOString() })
  assert.deepEqual(await host.dispatch('output.open', { file: 'O-0001' }), { opened: true, path: path.join(folder, '输出', '结果.xlsx') })
  assert.deepEqual(opened, [path.join(folder, '输出', '结果.xlsx')])
  fail = '没有关联的程序'
  await assert.rejects(host.dispatch('output.open', { file: 'O-0001' }), { code: 'IO_OPEN' })
  await host.close()
})

test('logs.export：日期范围、去掉资料内容、凭据替换掉', async () => {
  const dataDir = path.join(scratch, 'logs')
  const key = 'sk-secret-in-logs-987654'
  const host = new AppHost({ dataDir, python: 'python3' })
  host.store.secrets = { model: key, mcp: { oa: { token: 'tok-oa-abcdef', env: {} } } }
  const p = await host.dispatch('project.create', { name: '项目二', folder: path.join(scratch, '项目二') })
  const events = [
    { v: 'audit-events/1', seq: 1, ts: '2026-10-16T08:00:00Z', session: 'S-1', type: 'message.created', data: { message: 'M-1', text: '旧的一条' } },
    { v: 'audit-events/1', seq: 2, ts: '2026-10-17T08:00:00Z', session: 'S-1', type: 'message.created', data: { message: 'M-2', text: `应收账款明细，顺便 ${key}` } },
    { v: 'audit-events/1', seq: 3, ts: '2026-10-17T08:00:01Z', session: 'S-1', type: 'tool.finished', data: { call: 'K-1', tool: 'select_column', status: 'ok', durationMs: 120, summary: '提取 3 行：库存现金…' } },
  ]
  for (const e of events) host.store.appendEvent(p.project, e)
  fs.mkdirSync(path.join(dataDir, 'logs'), { recursive: true })
  fs.writeFileSync(path.join(dataDir, 'logs', 'host-2026-10-17.log'), `启动，令牌 tok-oa-abcdef\n`)
  fs.writeFileSync(path.join(dataDir, 'logs', 'host-2026-10-01.log'), '范围外\n')

  const r = await host.dispatch('logs.export', { from: '2026-10-17', to: '2026-10-17', includeContent: false })
  assert.equal(path.dirname(r.file), path.join(dataDir, 'exports'))
  assert.equal(fs.statSync(r.file).size, r.sizeBytes)
  const files = unzip(fs.readFileSync(r.file))
  assert.ok(files['app-info.json'] && files['privacy-status.json'] && files['settings.json'])
  assert.deepEqual(Object.keys(files).filter(f => f.startsWith('logs/')), ['logs/host-2026-10-17.log'])
  assert.equal(files['logs/host-2026-10-17.log'].toString('utf8'), '启动，令牌 *************\n')
  const lines = files[`events/${p.project}/S-1.jsonl`].toString('utf8').trim().split('\n').map(l => JSON.parse(l))
  assert.deepEqual(lines.map(e => e.seq), [2, 3])
  assert.deepEqual(lines[0].data, {})
  assert.deepEqual(lines[1].data, { call: 'K-1', tool: 'select_column', status: 'ok', durationMs: 120 })

  const full = unzip(fs.readFileSync((await host.dispatch('logs.export', { from: '2026-10-17', to: '2026-10-17', includeContent: true })).file))
  const text = full[`events/${p.project}/S-1.jsonl`].toString('utf8')
  assert.match(text, /应收账款明细/)
  for (const f of Object.values(full)) assert.ok(!f.includes(key) && !f.includes('tok-oa-abcdef'))
  await assert.rejects(host.dispatch('logs.export', { from: '10/17', to: '2026-10-17' }), { code: 'ARG_DATE' })
  await host.close()
})
