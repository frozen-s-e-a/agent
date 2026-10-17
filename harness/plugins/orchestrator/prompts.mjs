// 编排节点的提示词和输出 schema。改动任何一项都要升 version，并先跑评估集（设计 15.2）。
// 输出 schema 同时作为 submit 工具的参数 schema，字段与《接口约定》第三、五节一致。

const BASIS = { type: 'string', enum: ['user', 'confirmed', 'template', 'profile', 'data', 'inferred'] }
const STEP = {
  type: 'object',
  required: ['sql', 'inputs', 'purpose'],
  properties: {
    sql: { type: 'string', description: '只用 SELECT / WITH；表名写法见输入里各表的 sqlName' },
    inputs: { type: 'array', items: { type: 'string' }, description: '引用的资料表或前序结果表编号（D-… / R-…）' },
    purpose: { type: 'string' },
  },
}
const STEPS = { type: 'array', minItems: 1, items: STEP, description: '受控查询，按顺序执行；最后一步的结果即本区域结果' }

const COMMON = [
  '你是审计助手编排流程中的一个节点，只完成这一步，不做别的事。',
  '输入里的 anchors 是用户原话和已确认的口径，优先级最高，必须遵守。',
  '不编造坐标、表名、列名和数字；引用底稿位置时写输入里出现过的坐标和原文。',
  '依据（basis）取值：user 用户原话或回答；confirmed 本任务已确认；template 底稿标示；profile 项目档案；data 从资料确定；inferred 推断。',
].join('\n')

export const NODES = {
  understand: {
    role: 'router', version: 'understand/1',
    prompt: `${COMMON}\n\n任务：理解用户要交付什么。列出交付物、期间、范围和用户给出的约束。constraints 只摘用户原话中的片段，一字不改。不清楚又影响交付的点放进 unclear，最多 3 个，每个带选项和建议；能从底稿或资料确定的不要问。用户一次提了几项独立的工作时，每项写一条 subtasks。`,
    schema: {
      type: 'object',
      required: ['deliverables', 'period', 'scope', 'constraints', 'unclear', 'subtasks'],
      properties: {
        deliverables: { type: 'array', items: { type: 'object', required: ['kind'], properties: { kind: { type: 'string', enum: ['workpaper', 'table', 'report'] }, file: { type: 'string' } } } },
        period: { type: ['string', 'null'] },
        scope: { type: 'object' },
        constraints: { type: 'array', items: { type: 'string' } },
        unclear: { type: 'array', maxItems: 3, items: { type: 'object', required: ['item', 'options', 'suggest'], properties: { item: { type: 'string' }, options: { type: 'array', items: { type: 'string' } }, suggest: { type: 'integer' }, why: { type: 'string' } } } },
        subtasks: { type: 'array', items: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } },
      },
    },
  },

  region_semantics: {
    role: 'extractor', version: 'region_semantics/1',
    prompt: `${COMMON}\n\n任务：判断底稿中一个区域要填什么。给出区域用途；每个待填列的指标、期间、单位、方向，以及判断所依据的标签坐标（basisRef）；固定项目表的每个行标签对应什么科目或项目；哪些位置留给人工（manual）。判断不了的放进 uncertain，每项给选项和建议。区域确实不需要填写时 type 写 none。`,
    schema: {
      type: 'object',
      required: ['region', 'type', 'purpose', 'columns', 'manual', 'uncertain'],
      properties: {
        region: { type: 'string' },
        type: { type: 'string', enum: ['detail_table', 'fixed_table', 'form', 'checklist', 'text', 'none'] },
        purpose: { type: 'string' },
        columns: {
          type: 'array',
          items: {
            type: 'object', required: ['col', 'measure', 'basis', 'confidence'],
            properties: {
              col: { type: 'string' }, measure: { type: 'string' }, period: { type: ['string', 'null'] }, unit: { type: ['string', 'null'] },
              direction: { type: ['string', 'null'] }, basis: BASIS, basisRef: { type: 'string' }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
          },
        },
        rows: { type: 'array', items: { type: 'object', required: ['row', 'text'], properties: { row: { type: 'integer' }, text: { type: 'string' }, account: { type: 'string' }, formula: { type: 'boolean' } } } },
        manual: { type: 'array', items: { type: 'string' } },
        uncertain: { type: 'array', items: { type: 'object', required: ['item', 'options', 'suggest'], properties: { item: { type: 'string' }, options: { type: 'array', items: { type: 'string' } }, suggest: { type: 'integer' }, why: { type: 'string' } } } },
      },
    },
  },

  field_semantics: {
    role: 'extractor', version: 'field_semantics/1',
    prompt: `${COMMON}\n\n任务：判断一张资料表每一列的含义和整张表的类型（科目余额表 trial_balance、序时账 journal、银行流水 bank_statement、往来明细 ledger_detail、其他 other）。只根据表头、列统计和样例判断；meaning 用英文键（如 voucher_date、account_code、debit、credit、opening、closing、counterparty、summary），type 取 date、decimal、text、integer。`,
    schema: {
      type: 'object',
      required: ['kind', 'fields'],
      properties: {
        kind: { type: 'string' },
        fields: {
          type: 'array', minItems: 1,
          items: { type: 'object', required: ['col', 'name', 'meaning', 'type', 'basis'], properties: { col: { type: 'string' }, name: { type: 'string' }, meaning: { type: 'string' }, type: { type: 'string', enum: ['date', 'decimal', 'text', 'integer'] }, basis: BASIS } },
        },
      },
    },
  },

  basis: {
    role: 'planner', version: 'basis/1',
    prompt: `${COMMON}\n\n任务：为一个待填区域定口径，并用受控查询表达计算。每个口径要素都要给出，并写明依据：数据来源、期间、范围（含排除条件和理由）、金额与方向、分组与对应、单位与精度、控制数。计算只写 SQL，不写任何数字结果；数字由代码执行查询得到。bindings 说明结果的哪一行哪一列写进底稿哪个单元格（行号从 1 起，列名为结果列名）。依据只能是推断、又会影响结果的要素，放进 inferred 作为要问用户的问题（最多 3 个）：每个选项写清含义，不是建议选项的另附该选项下的 steps。输入有 lastFailure 时，说明上次核对没通过，按原因修正。`,
    schema: {
      type: 'object',
      required: ['region', 'sources', 'period', 'scope', 'amount', 'grouping', 'unit', 'control', 'steps', 'bindings', 'inferred'],
      properties: {
        region: { type: 'string' },
        sources: { type: 'array', minItems: 1, items: { type: 'object', required: ['table'], properties: { table: { type: 'string' }, columns: { type: 'array', items: { type: 'string' } } } } },
        period: { type: 'object', required: ['value', 'basis'], properties: { value: { type: 'string' }, basis: BASIS, basisRef: { type: 'string' } } },
        scope: { type: 'object', required: ['include', 'exclude', 'basis'], properties: { include: { type: 'string' }, exclude: { type: 'array', items: { type: 'object', required: ['condition', 'reason'], properties: { condition: { type: 'string' }, reason: { type: 'string' } } } }, basis: BASIS } },
        amount: { type: 'object', required: ['column', 'direction', 'basis'], properties: { column: { type: 'string' }, direction: { type: 'string' }, sign: { type: 'string' }, basis: BASIS } },
        grouping: { type: 'object', required: ['description', 'basis'], properties: { description: { type: 'string' }, basis: BASIS } },
        unit: { type: 'object', required: ['scale', 'basis'], properties: { scale: { type: 'string' }, rounding: { type: 'string' }, basis: BASIS } },
        control: {
          type: 'object', required: ['label', 'column', 'right', 'basis'],
          properties: { label: { type: 'string' }, column: { type: 'string', description: '本区域结果中参与控制数核对的列' }, right: { type: 'object', description: '控制数来源，如 { kind: "balance", table: "D-001", account: "1122", field: "closing" }' }, rightLabel: { type: 'string' }, basis: BASIS },
        },
        steps: STEPS,
        bindings: { type: 'array', items: { type: 'object', required: ['cell', 'row', 'column'], properties: { cell: { type: 'string' }, row: { type: 'integer' }, column: { type: 'string' } } } },
        manual: { type: 'array', items: { type: 'string' } },
        inferred: {
          type: 'array', maxItems: 3,
          items: {
            type: 'object', required: ['id', 'text', 'options', 'suggest'],
            properties: {
              id: { type: 'string' }, item: { type: 'string' }, text: { type: 'string' }, suggest: { type: 'integer' },
              options: { type: 'array', minItems: 2, items: { type: 'object', required: ['label'], properties: { label: { type: 'string' }, steps: STEPS } } },
            },
          },
        },
        summary: { type: 'string', description: '一句话口径摘要，用于写入确认卡' },
      },
    },
  },

  recompute: {
    role: 'planner', version: 'recompute/1',
    prompt: `${COMMON}\n\n任务：独立地重新计算一个区域的关键数，作为双路复算的第二路。只根据区域语义、资料表说明和锚点自己定口径并写受控查询，不参考任何已有的查询。输出的结果列名与 resultColumns 一致，行与底稿行标签一一对应。`,
    schema: { type: 'object', required: ['steps'], properties: { steps: STEPS, note: { type: 'string' } } },
  },

  judge: {
    role: 'judge', version: 'judge/1',
    prompt: `${COMMON}\n\n任务：同一区域的两路计算结果不一致。根据区域语义和用户原话判断哪一路的口径正确：first、second，或判断不了时 undecided。理由要指出两路在来源、期间、范围或方向上的具体差别。`,
    schema: { type: 'object', required: ['verdict', 'reason'], properties: { verdict: { type: 'string', enum: ['first', 'second', 'undecided'] }, reason: { type: 'string' } } },
  },

  notes: {
    role: 'writer', version: 'notes/1',
    prompt: `${COMMON}\n\n任务：为底稿的一个文字区写审计说明草稿。只使用 figures 里给出的数字，原样书写（可以加千分位），不计算新的数字，不下结论性判断；结论留给审计人员。直接输出正文。`,
  },

  message_scope: {
    role: 'router', version: 'message_scope/1',
    prompt: `${COMMON}\n\n任务：任务进行中用户补充了一句话。判断它影响哪些区域（只能从 regions 中选），不影响任何区域时返回空数组。`,
    schema: { type: 'object', required: ['regions', 'reason'], properties: { regions: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' } } },
  },
}
