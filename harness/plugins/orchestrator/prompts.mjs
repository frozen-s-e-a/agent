// 编排节点的提示词和输出 schema。改动任何一项都要升 version，并先跑评估集（设计 15.2）。
// 输出 schema 同时作为 submit 工具的参数 schema，字段与《接口约定》第三、五节一致。

// 漏写依据时按“推断”记（最保守），不为此重做；校验时补上（schema.mjs 的 default）
const BASIS = { type: 'string', enum: ['user', 'confirmed', 'template', 'profile', 'data', 'inferred'], default: 'inferred' }
// 底稿坐标：可带工作表名，单格或区域
const CELL_REF = '^(?:[^!]+!)?\\$?[A-Z]{1,3}\\$?[0-9]+(?::\\$?[A-Z]{1,3}\\$?[0-9]+)?$'
// 资料表类型，与审计工具 data_import 的 kind 一致
const TABLE_KINDS = ['trial_balance', 'journal', 'bank_statement', 'ledger_detail', 'aging', 'contract', 'other']
// 列含义，与审计工具 data.py 的 MEANINGS 一致；核对和导入按这些键找列（模型曾写成 closing_balance，控制数找不到期末列）
const FIELD_MEANINGS = ['voucher_date', 'voucher_no', 'account_code', 'account_name', 'summary', 'debit', 'credit', 'opening', 'closing', 'direction',
  'counterparty', 'customer', 'supplier', 'amount', 'balance', 'date', 'invoice_no', 'invoice_date', 'contract_no', 'quantity', 'price',
  'inflow', 'outflow', 'currency', 'department', 'project', 'other']
const STEP = {
  type: 'object',
  required: ['sql', 'inputs', 'purpose'],
  properties: {
    sql: { type: 'string', description: '只用 SELECT / WITH；表名写法见输入里各表的 sqlName；列名用资料表的列名原文并加双引号（如 "科目编码"），不是 meaning 键' },
    inputs: { type: 'array', items: { type: 'string' }, description: '引用的资料表或前序结果表编号（D-… / R-…）' },
    purpose: { type: 'string' },
  },
}
const STEPS = { type: 'array', minItems: 1, items: STEP, description: '受控查询，按顺序执行；最后一步的结果即本区域结果' }
// 待问选项的查询：建议项沿用上面的 steps，可以不写或写空数组
const OPTION_STEPS = { type: 'array', items: STEP, description: '选这一项时的受控查询；建议项沿用 steps，可留空' }

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
    role: 'extractor', version: 'region_semantics/2',
    prompt: `${COMMON}\n\n任务：判断底稿中一个区域要填什么。给出区域用途；每个待填列的指标、期间、单位、方向，以及判断所依据的标签坐标（basisRef）；固定项目表的每个行标签对应什么科目或项目；哪些位置留给人工（manual）。判断不了的放进 uncertain，每项给选项和建议。区域确实不需要填写时 type 写 none。\n这些字段会逐项和底稿核对，写法要严格：basisRef 是一个文字标签单元格的坐标（如 应收账款!B6）；rows 只列有行标签的行，text 照抄该行行标签原文，对应的科目或说明写在 account，明细表和文字区域不列 rows；manual 每项只写坐标（如 应收账款!E7 或 应收账款!C7:C10），不写说明。说明、理由和提醒写进 purpose 或 uncertain。`,
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
        rows: { type: 'array', description: '只列固定项目表有行标签的行', items: { type: 'object', required: ['row', 'text'], properties: { row: { type: 'integer' }, text: { type: 'string', description: '照抄该行行标签原文' }, account: { type: 'string', description: '对应的科目或项目' }, formula: { type: 'boolean' } } } },
        manual: { type: 'array', items: { type: 'string', pattern: CELL_REF, description: '只写单元格坐标，如 应收账款!E7 或 应收账款!C7:C10' } },
        uncertain: { type: 'array', items: { type: 'object', required: ['item', 'options', 'suggest'], properties: { item: { type: 'string' }, options: { type: 'array', items: { type: 'string' } }, suggest: { type: 'integer' }, why: { type: 'string' } } } },
      },
    },
  },

  field_semantics: {
    role: 'extractor', version: 'field_semantics/3',
    prompt: `${COMMON}\n\n任务：判断一张资料表每一列的含义和整张表的类型，表类型写在 kind（科目余额表 trial_balance、序时账 journal、银行流水 bank_statement、往来明细 ledger_detail、账龄表 aging、合同台账 contract、其他 other）。只根据表头、列统计和样例判断；fields 每项对应资料表里的一列，col 写列字母；meaning 从 schema 列出的英文键里选（期初余额 opening、期末余额 closing，不要写成 opening_balance 之类），对不上的写 other；type 取 date、decimal、text、integer。`,
    schema: {
      type: 'object',
      required: ['kind', 'fields'],
      properties: {
        kind: { type: 'string', enum: TABLE_KINDS, description: '整张资料表的类型' },
        fields: {
          type: 'array', minItems: 1,
          items: { type: 'object', required: ['col', 'name', 'meaning', 'type', 'basis'], properties: { col: { type: 'string' }, name: { type: 'string' }, meaning: { type: 'string', enum: FIELD_MEANINGS }, type: { type: 'string', enum: ['date', 'decimal', 'text', 'integer'] }, basis: BASIS } },
        },
      },
    },
  },

  basis: {
    role: 'planner', version: 'basis/4',
    prompt: `${COMMON}\n\n任务：为一个待填区域定口径，并用受控查询表达计算。每个口径要素都要给出，并写明依据：数据来源、期间、范围（含排除条件和理由）、金额与方向、分组与对应、单位与精度、控制数。计算只写 SQL，不写任何数字结果；数字由代码执行查询得到。SQL 里的列名用资料表的列名原文（如 "科目编码"），meaning 只是说明，不能当列名。control.column 和 bindings 的列名照抄 SQL 结果里的列名（AS 后面的名字），不加说明。bindings 说明结果的哪一行哪一列写进底稿哪个单元格（行号从 1 起）。依据只能是推断、又会影响结果的要素，放进 inferred 作为要问用户的问题（最多 3 个）：每个选项写清含义，不是建议选项的另附该选项下的 steps。输入有 lastFailure 时，说明上次核对没通过，按原因修正。`,
    schema: {
      type: 'object',
      required: ['region', 'sources', 'period', 'scope', 'amount', 'grouping', 'unit', 'control', 'steps', 'bindings', 'inferred'],
      properties: {
        region: { type: 'string' },
        sources: { type: 'array', minItems: 1, items: { type: 'object', required: ['table'], properties: { table: { type: 'string' }, columns: { type: 'array', items: { type: 'string' } } } } },
        period: { type: 'object', required: ['value', 'basis'], properties: { value: { type: 'string' }, basis: BASIS, basisRef: { type: 'string' } } },
        // basis 放在前面：排除条件一长，模型常把排在最后的 basis 漏掉
        scope: { type: 'object', required: ['basis', 'include', 'exclude'], properties: { basis: BASIS, include: { type: 'string' }, exclude: { type: 'array', items: { type: 'object', required: ['condition', 'reason'], properties: { condition: { type: 'string' }, reason: { type: 'string' } } } } } },
        amount: { type: 'object', required: ['column', 'direction', 'basis'], properties: { column: { type: 'string' }, direction: { type: 'string' }, sign: { type: 'string' }, basis: BASIS } },
        grouping: { type: 'object', required: ['description', 'basis'], properties: { description: { type: 'string' }, basis: BASIS } },
        unit: { type: 'object', required: ['scale', 'basis'], properties: { scale: { type: 'string' }, rounding: { type: 'string' }, basis: BASIS } },
        control: {
          type: 'object', required: ['label', 'column', 'right', 'basis'],
          properties: { label: { type: 'string' }, column: { type: 'string', description: '本区域结果中参与控制数核对的列' }, right: { type: 'object', description: '控制数来源，如 { kind: "balance", table: "D-001", account: "1122", field: "closing" }' }, rightLabel: { type: 'string' }, basis: BASIS },
        },
        steps: STEPS,
        bindings: { type: 'array', items: { type: 'object', required: ['cell', 'row', 'column'], properties: { cell: { type: 'string' }, row: { type: 'integer' }, column: { type: 'string' } } } },
        manual: { type: 'array', items: { type: 'string', pattern: CELL_REF, description: '只写单元格坐标，如 应收账款!C7:C10；不填的原因写进 summary 或 scope' } },
        inferred: {
          type: 'array', maxItems: 3,
          items: {
            type: 'object', required: ['id', 'text', 'options', 'suggest'],
            properties: {
              id: { type: 'string' }, item: { type: 'string' }, text: { type: 'string' }, suggest: { type: 'integer' },
              options: { type: 'array', minItems: 2, items: { type: 'object', required: ['label'], properties: { label: { type: 'string' }, steps: OPTION_STEPS } } },
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
