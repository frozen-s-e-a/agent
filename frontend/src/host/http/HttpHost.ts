// 真实宿主（app-host）的浏览器连接：命令走 POST /rpc，事件走 Server-Sent Events（/events）。
// 桌面版走 Electron IPC（../desktop/IpcHost.ts），实现同一个 HostClient 接口。
import { HostError, type AuditEvent, type Method, type ParamsOf, type ProjectFile, type ResultOf } from "../../protocol/types";
import type { HostClient } from "../client";

const HEADERS = { "Content-Type": "application/json", "X-Audit-Host": "1" };

export class HttpHost implements HostClient {
  private listeners = new Set<(e: AuditEvent) => void>();
  private connListeners = new Set<(c: boolean) => void>();
  private source: EventSource | null = null;
  private connected = false;
  private nextId = 0;

  constructor(private base = "") {
    this.connect();
  }

  private connect() {
    const es = new EventSource(`${this.base}/events`);
    this.source = es;
    es.onopen = () => this.setConnected(true);
    es.onmessage = (m) => {
      const e = JSON.parse(m.data) as AuditEvent;
      for (const l of this.listeners) l(e);
    };
    // EventSource 自己会重连；断开期间漏掉的事件由前端按 seq 补取（AppStore.catchUp）
    es.onerror = () => this.setConnected(false);
  }

  private setConnected(c: boolean) {
    if (c === this.connected) return;
    this.connected = c;
    for (const l of this.connListeners) l(c);
  }

  async request<M extends Method>(method: M, params: ParamsOf<M>): Promise<ResultOf<M>> {
    let res: Response;
    try {
      res = await fetch(`${this.base}/rpc`, { method: "POST", headers: HEADERS, body: JSON.stringify({ id: String(++this.nextId), method, params }) });
    } catch {
      throw new HostError("ENV_DISCONNECTED", "连不上宿主");
    }
    const body = (await res.json()) as { ok: boolean; result?: ResultOf<M>; error?: { code: string; message: string } };
    if (!body.ok) throw new HostError(body.error?.code ?? "ENV_INTERNAL", body.error?.message ?? `宿主返回 ${res.status}`);
    return body.result as ResultOf<M>;
  }

  /** 浏览器拿不到本机路径：把拖进来的文件传给宿主，存进项目后登记（等同 files.add）。 */
  async addFiles(project: string, files: File[]): Promise<ProjectFile[]> {
    const out: ProjectFile[] = [];
    for (const f of files) {
      const res = await fetch(`${this.base}/upload?project=${encodeURIComponent(project)}&name=${encodeURIComponent(f.name)}`, {
        method: "POST",
        headers: { "X-Audit-Host": "1" },
        body: f,
      });
      const body = (await res.json()) as { ok: boolean; result?: { files: ProjectFile[] }; error?: { code: string; message: string } };
      if (!body.ok) throw new HostError(body.error?.code ?? "IO_UPLOAD", body.error?.message ?? "上传失败");
      out.push(...body.result!.files);
    }
    return out;
  }

  subscribe(listener: (event: AuditEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onConnectionChange(listener: (connected: boolean) => void) {
    this.connListeners.add(listener);
    return () => this.connListeners.delete(listener);
  }

  close() {
    this.source?.close();
  }
}
