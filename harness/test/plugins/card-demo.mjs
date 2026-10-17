// 测试用插件：注册一个工具 demo_card，调用时通过宿主桥接发出一张卡片，等用户回答后把回答作为工具结果返回。
// 用来验证《接口约定》1.1 第二项：卡片回答怎么送回正在等待的编排代码。
export const name = 'audit-card-demo'
export const inject = ['tools', 'auditCards']

let seq = 0

export function apply(ctx) {
  ctx.effect(() => ctx.tools.register({
    name: 'demo_card',
    description: '向用户出一张确认卡片并等待回答（测试用）。',
    parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const card = { card: 'C-' + String(++seq).padStart(3, '0'), kind: 'question', title: args.title, blocking: true, body: {}, actions: ['confirm', 'reject'], defaultAction: 'confirm' }
      const answer = await ctx.auditCards.open(exec.agent, card, exec.signal)
      return { card: card.card, action: answer.action, note: answer.note }
    },
  }), 'demo_card')
}
