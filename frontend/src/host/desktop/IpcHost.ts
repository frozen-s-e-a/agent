// 桌面版（Electron 外壳）的宿主连接：命令和事件都走 IPC，由 desktop/preload.cjs 暴露为 window.auditDesktop。
// 宿主就在本机进程里，没有断线；选中的文件直接给本机路径（files.add），不用上传。
import { HostError, type AuditEvent, type Method, type ParamsOf, type ProjectFile, type ResultOf } from "../../protocol/types";
import type { HostClient } from "../client";

export interface DesktopBridge {
  invoke(method: string, params: unknown): Promise<{ ok: boolean; result?: unknown; error?: { code: string; message: string } }>;
  onEvent(listener: (event: AuditEvent) => void): () => void;
  pathForFile(file: File): string;
  chooseFolder(title?: string): Promise<string | null>;
}

declare global {
  interface Window {
    auditDesktop?: DesktopBridge;
  }
}

export class IpcHost implements HostClient {
  constructor(private bridge: DesktopBridge) {}

  async request<M extends Method>(method: M, params: ParamsOf<M>): Promise<ResultOf<M>> {
    const r = await this.bridge.invoke(method, params);
    if (!r.ok) throw new HostError(r.error?.code ?? "ENV_INTERNAL", r.error?.message ?? "宿主出错");
    return r.result as ResultOf<M>;
  }

  subscribe(listener: (event: AuditEvent) => void) {
    return this.bridge.onEvent(listener);
  }

  async addFiles(project: string, files: File[]): Promise<ProjectFile[]> {
    const paths = files.map((f) => this.bridge.pathForFile(f)).filter(Boolean);
    if (!paths.length) throw new HostError("IO_NOT_FOUND", "拿不到文件在本机的位置");
    return (await this.request("files.add", { project, paths })).files;
  }

  chooseFolder(title?: string) {
    return this.bridge.chooseFolder(title);
  }
}
