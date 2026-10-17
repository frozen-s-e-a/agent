// 模型输出的结构校验：支持编排用到的 JSON Schema 子集（type、properties、required、items、enum、minItems、maxItems）。
// 返回错误清单，每条带路径，直接回填给模型修正。

const typeOf = value => value === null ? 'null' : Array.isArray(value) ? 'array' : Number.isInteger(value) ? 'integer' : typeof value

function matchesType(value, type) {
  const actual = typeOf(value)
  if (Array.isArray(type)) return type.some(t => matchesType(value, t))
  if (type === 'number') return actual === 'number' || actual === 'integer'
  return actual === type
}

export function validate(schema, value, path = '$', errors = []) {
  if (schema === undefined || schema === true) return errors
  if (schema.type !== undefined && !matchesType(value, schema.type)) {
    errors.push(`${path} 应为 ${[].concat(schema.type).join('/')}，实际为 ${typeOf(value)}`)
    return errors
  }
  if (schema.enum !== undefined && !schema.enum.some(item => item === value)) {
    errors.push(`${path} 只能取 ${schema.enum.map(v => JSON.stringify(v)).join('、')}`)
  }
  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? []) {
      if (value[key] === undefined) errors.push(`${path}.${key} 缺失`)
    }
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (value[key] !== undefined) validate(sub, value[key], `${path}.${key}`, errors)
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} 至少 ${schema.minItems} 项`)
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path} 最多 ${schema.maxItems} 项`)
    if (schema.items !== undefined) value.forEach((item, index) => validate(schema.items, item, `${path}[${index}]`, errors))
  }
  return errors
}

/** 从模型的文字回复里取出 JSON：整段、```json 代码块，或第一个完整的花括号对象。 */
export function extractJson(text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return undefined
  const candidates = [trimmed]
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) candidates.push(fenced[1].trim())
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) candidates.push(trimmed.slice(start, end + 1))
  for (const candidate of candidates) {
    try { return JSON.parse(candidate) } catch {}
  }
  return undefined
}
