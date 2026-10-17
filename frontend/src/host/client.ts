import type { AuditEvent, Method, ParamsOf, ResultOf } from "../protocol/types";

// 前端只认这个接口：请求-响应命令 + 宿主主动推送的事件。
// 假宿主和真实宿主（Electron IPC 或 WebSocket）各实现一份，界面代码不变。
export interface HostClient {
  request<M extends Method>(method: M, params: ParamsOf<M>): Promise<ResultOf<M>>;
  /** 订阅事件推送，返回取消订阅函数 */
  subscribe(listener: (event: AuditEvent) => void): () => void;
  /** 连接状态，用于断线重连补取 */
  onConnectionChange?(listener: (connected: boolean) => void): () => void;
}
