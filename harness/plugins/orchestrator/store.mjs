// 编排状态存储：一个项目一个目录（一个 Harness 进程只服务一个项目）。
//   counters.json            项目内编号计数（卡片 C-、产出 O-），宿主也从这里取号，保证项目内唯一
//   tasks/<T-编号>/task.json  任务状态与节点检查点；每个节点完成后整体写一次
//   tasks/<T-编号>/calls.jsonl 编排发起的模型调用记录（角色、提示词版本、输入输出、用量）
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const WIDTH = { C: 3, O: 4 }

function writeAtomic(file, text) {
  const temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`
  fs.writeFileSync(temp, text)
  fs.renameSync(temp, file)
}

export class Store {
  constructor(dir) {
    this.dir = path.resolve(dir)
    this.tasksDir = path.join(this.dir, 'tasks')
    fs.mkdirSync(this.tasksDir, { recursive: true })
    this.countersFile = path.join(this.dir, 'counters.json')
  }

  /** 分配项目内唯一的编号，例如 allocate('C') → 'C-004'。 */
  allocate(prefix) {
    if (!(prefix in WIDTH)) throw new Error('unknown id prefix: ' + prefix)
    let counters = {}
    try { counters = JSON.parse(fs.readFileSync(this.countersFile, 'utf8')) } catch {}
    const next = (counters[prefix] ?? 0) + 1
    counters[prefix] = next
    writeAtomic(this.countersFile, JSON.stringify(counters))
    return `${prefix}-${String(next).padStart(WIDTH[prefix], '0')}`
  }

  newTaskId() {
    for (;;) {
      const id = 'T-' + crypto.randomBytes(2).toString('hex')
      if (!fs.existsSync(path.join(this.tasksDir, id))) return id
    }
  }

  taskDir(task) {
    if (!/^T-[0-9a-f]{4,}$/.test(task)) throw new Error('invalid task id: ' + task)
    return path.join(this.tasksDir, task)
  }

  save(state) {
    const dir = this.taskDir(state.task)
    fs.mkdirSync(dir, { recursive: true })
    state.updatedAt = new Date().toISOString()
    writeAtomic(path.join(dir, 'task.json'), JSON.stringify(state))
  }

  load(task) {
    try { return JSON.parse(fs.readFileSync(path.join(this.taskDir(task), 'task.json'), 'utf8')) } catch { return undefined }
  }

  list() {
    return fs.readdirSync(this.tasksDir).filter(name => /^T-[0-9a-f]{4,}$/.test(name)).map(name => this.load(name)).filter(Boolean)
  }

  appendCall(task, entry) {
    const dir = this.taskDir(task)
    fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(path.join(dir, 'calls.jsonl'), JSON.stringify(entry) + '\n')
  }
}
