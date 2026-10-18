import type { AuditEvent, Method, ParamsOf, ProjectFile, ResultOf } from "../protocol/types";

// 前端只认这个接口：请求-响应命令 + 宿主主动推送的事件。
// 假宿主（回放）和真实宿主（浏览器开发版走 HTTP + SSE，桌面版走 Electron IPC，见 desktop/IpcHost）各实现一份，界面代码不变。
export interface HostClient {
  request<M extends Method>(method: M, params: ParamsOf<M>): Promise<ResultOf<M>>;
  /** 订阅事件推送，返回取消订阅函数 */
  subscribe(listener: (event: AuditEvent) => void): () => void;
  /** 连接状态，用于断线重连补取 */
  onConnectionChange?(listener: (connected: boolean) => void): () => void;
  /** 浏览器里拖进来的文件（拿不到本机路径时）：传给宿主存进项目。没有时用 files.add 传路径 */
  addFiles?(project: string, files: File[]): Promise<ProjectFile[]>;
  /** 系统的选择文件夹对话框（桌面版才有）；取消时返回 null */
  chooseFolder?(title?: string): Promise<string | null>;
}
