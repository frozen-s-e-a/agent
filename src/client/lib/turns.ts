import type {AgentRun, ChatEvent, SessionRecord, Task, TextEvent, ToolCall} from '../types';

export type TurnBlock = {kind: 'text'; event: TextEvent} | {kind: 'steps'; id: string; calls: ToolCall[]};

/** One request and everything the Agent did for it: steps, replies, the run record and its results. */
export interface Turn {
  id: string;
  request?: Extract<ChatEvent, {type: 'user'}>;
  run?: AgentRun;
  blocks: TurnBlock[];
  tasks: Task[];
}

/** Text the backend writes for a resume that carried no new answer. */
export const AUTO_RESUME_PREFIX = '继续上次任务：';

/**
 * Splits a conversation into turns. Events carry the run they belong to; events without one
 * (task notices, early errors) stay with the turn they follow.
 */
export function buildTurns(record: SessionRecord): Turn[] {
  const turns: Turn[] = [];
  const byRun = new Map<string, Turn>();
  const runs = new Map(record.agentRuns.map(run => [run.id, run]));
  const callOf = (id: string): ToolCall => record.calls.find(call => call.id === id) || {id, name: '', status: 'running'};

  const turnFor = (event: ChatEvent): Turn => {
    if (event.runId && byRun.has(event.runId)) return byRun.get(event.runId)!;
    if (event.type === 'user' || !turns.length) {
      const turn: Turn = {id: event.runId || event.id, run: event.runId ? runs.get(event.runId) : undefined, blocks: [], tasks: []};
      turns.push(turn);
      if (event.runId) byRun.set(event.runId, turn);
      return turn;
    }
    return turns[turns.length - 1];
  };

  for (const event of record.events) {
    const turn = turnFor(event);
    if (event.type === 'user') turn.request = event;
    else if (event.type === 'tool') {
      const last = turn.blocks.at(-1);
      if (last?.kind === 'steps') last.calls.push(callOf(event.callId));
      else turn.blocks.push({kind: 'steps', id: event.id, calls: [callOf(event.callId)]});
    } else if (event.type === 'assistant' || event.type === 'error') turn.blocks.push({kind: 'text', event});
  }
  for (const task of record.tasks) {
    const turn = task.agentRunId ? byRun.get(task.agentRunId) : undefined;
    if (turn) turn.tasks.push(task);
  }
  return turns;
}

/** Display name for an audit program id, falling back to the id itself. */
export function toolName(names: Map<string, string>, id: string) {
  return names.get(id) || names.get('mcp_' + id) || id;
}
