// 左栏：项目切换器 → 对话 / 资料 / 成果三个标签 → 设置入口和连接状态。
import {
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Empty, Input, Modal, Tooltip } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { OutputFile, ProjectFile, SessionSummary } from "../../protocol/types";
import { relTime } from "../../lib/format";
import { useApp, useAppStore } from "../../store/context";

export function Sidebar() {
  const store = useAppStore();
  const ui = useApp((s) => s.ui);
  const project = ui.projects.find((p) => p.project === ui.project);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);

  return (
    <aside className="sidebar">
      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            ...ui.projects.map((p) => ({
              key: p.project,
              label: (
                <div style={{ display: "flex", flexDirection: "column", padding: "2px 0" }}>
                  <span style={{ fontWeight: p.project === ui.project ? 600 : 400 }}>{p.name}</span>
                  <span className="faint" style={{ fontSize: 11 }}>{p.folder}</span>
                </div>
              ),
            })),
            { type: "divider" as const },
            { key: "_new", icon: <PlusOutlined />, label: "新建项目…" },
            { key: "_rename", icon: <EditOutlined />, label: "重命名当前项目" },
            { key: "_remove", icon: <DeleteOutlined />, label: "从应用中移除（不删文件）", danger: true },
          ],
          onClick: ({ key }) => {
            if (key === "_new") return store.setUi({ page: "main" }), Modal.info({ title: "新建项目", content: "选择一个本机文件夹作为项目目录（Electron 外壳里弹出系统选择框）。" });
            if (key.startsWith("_")) return;
            store.setUi({ project: key, session: null, tabs: [], activeTab: null });
            void store.refreshSessions();
          },
        }}
      >
        <div className="proj-switch">
          <div className="proj-avatar">{project?.name.slice(0, 1) ?? "项"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="proj-name">{project?.name ?? "选择项目"}</div>
            <div className="proj-folder">{project?.folder}</div>
          </div>
          <SwapOutlined className="faint" />
        </div>
      </Dropdown>

      <div className="side-tabs">
        {(
          [
            ["sessions", "对话"],
            ["files", "资料"],
            ["outputs", "成果"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} className={`side-tab ${ui.leftTab === k ? "active" : ""}`} onClick={() => store.setUi({ leftTab: k })}>
            {label}
          </button>
        ))}
      </div>

      {ui.leftTab === "sessions" && <SessionList onRename={(id, title) => setRenaming({ id, title })} />}
      {ui.leftTab === "files" && <FileList />}
      {ui.leftTab === "outputs" && <OutputList />}

      <SideFoot />

      <Modal
        title="重命名对话"
        open={!!renaming}
        onCancel={() => setRenaming(null)}
        onOk={async () => {
          if (renaming) await store.host.request("session.rename", { session: renaming.id, title: renaming.title });
          setRenaming(null);
          void store.refreshSessions();
        }}
      >
        <Input value={renaming?.title} onChange={(e) => setRenaming((r) => r && { ...r, title: e.target.value })} />
      </Modal>
    </aside>
  );
}

function sessionStatus(s: SessionSummary): { cls: string; label: string } {
  if (s.openCards) return { cls: "waiting", label: "等你处理" };
  if (s.tasks.some((t) => t.status === "running" || t.status === "blocked")) return { cls: "running", label: "进行中" };
  if (s.tasks.some((t) => t.status === "failed")) return { cls: "failed", label: "失败" };
  if (s.tasks.length && s.tasks.every((t) => t.status === "completed")) return { cls: "done", label: "已完成" };
  return { cls: "idle", label: "对话" };
}

function SessionList({ onRename }: { onRename: (id: string, title: string) => void }) {
  const store = useAppStore();
  const sessions = useApp((s) => s.ui.sessions);
  const current = useApp((s) => s.ui.session);
  const [q, setQ] = useState("");
  const list = useMemo(() => sessions.filter((s) => !q || s.title.includes(q)), [sessions, q]);
  const today = new Date().toDateString();
  const groups = useMemo(() => {
    const g: { label: string; items: SessionSummary[] }[] = [
      { label: "今天", items: [] },
      { label: "更早", items: [] },
    ];
    for (const s of list) (new Date(s.lastActive).toDateString() === today ? g[0] : g[1]).items.push(s);
    return g.filter((x) => x.items.length);
  }, [list, today]);

  return (
    <>
      <div className="side-actions">
        <Button block icon={<PlusOutlined />} onClick={() => void store.newSession()}>
          新建对话
        </Button>
      </div>
      <div style={{ padding: "0 10px 6px" }}>
        <Input size="small" allowClear prefix={<SearchOutlined className="faint" />} placeholder="搜索对话" value={q} onChange={(e) => setQ(e.target.value)} variant="filled" />
      </div>
      <div className="side-list">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="side-group">{g.label}</div>
            {g.items.map((s) => {
              const st = sessionStatus(s);
              return (
                <div key={s.session} className={`side-item ${current === s.session ? "active" : ""}`} onClick={() => void store.openSession(s.session)}>
                  <Tooltip title={st.label} placement="right">
                    <span className={`dot ${st.cls}`} />
                  </Tooltip>
                  <span className="title">{s.title}</span>
                  <span className="meta">{relTime(s.lastActive)}</span>
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        { key: "rename", icon: <EditOutlined />, label: "重命名" },
                        { key: "delete", icon: <DeleteOutlined />, label: "删除", danger: true },
                      ],
                      onClick: ({ key, domEvent }) => {
                        domEvent.stopPropagation();
                        if (key === "rename") onRename(s.session, s.title);
                        if (key === "delete")
                          Modal.confirm({
                            title: "删除这个对话？",
                            content: "只删除应用里的记录，项目文件夹里的产出文件不会删除。",
                            okText: "删除",
                            okButtonProps: { danger: true },
                            cancelText: "取消",
                            onOk: async () => {
                              await store.host.request("session.delete", { session: s.session });
                              if (current === s.session) store.setUi({ session: null, tabs: [], activeTab: null });
                              void store.refreshSessions();
                            },
                          });
                      },
                    }}
                  >
                    <Button className="more" size="small" type="text" icon={<EllipsisOutlined />} onClick={(e) => e.stopPropagation()} />
                  </Dropdown>
                </div>
              );
            })}
          </div>
        ))}
        {!groups.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有对话" />}
      </div>
    </>
  );
}

function FileList() {
  const store = useAppStore();
  const project = useApp((s) => s.ui.project);
  const attach = useApp((s) => s.ui.attach);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  useEffect(() => {
    if (project) void store.host.request("files.list", { project }).then((r) => setFiles(r.files));
  }, [store, project]);
  return (
    <>
      <div className="side-actions">
        <Button block icon={<FolderOpenOutlined />} onClick={() => Modal.info({ title: "添加资料", content: "在 Electron 外壳里弹出系统文件选择框，选中的文件用 files.add 加入项目。" })}>
          添加资料
        </Button>
      </div>
      <div className="side-list">
        <div className="side-group">项目资料 · 所有对话共用</div>
        {files.map((f) => (
          <div key={f.file} className="file-row" onClick={() => store.openSheet(f.file, { title: f.name })}>
            <span className={`file-icon ${f.kind === "data" ? "data" : ""}`}>XLS</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
              <div className="faint" style={{ fontSize: 11 }}>
                {f.kind === "workpaper" ? "底稿" : "资料"} · {fmtSize(f.sizeBytes)}
              </div>
            </div>
            <Tooltip title={attach.includes(f.file) ? "已加入本条消息" : "加入本条消息"}>
              <Button
                size="small"
                type={attach.includes(f.file) ? "primary" : "text"}
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  store.fileNames.set(f.file, f.name);
                  store.setUi((ui) => ({ attach: ui.attach.includes(f.file) ? ui.attach.filter((x) => x !== f.file) : [...ui.attach, f.file] }));
                }}
              />
            </Tooltip>
          </div>
        ))}
      </div>
    </>
  );
}

function OutputList() {
  const store = useAppStore();
  const project = useApp((s) => s.ui.project);
  const sessions = useApp((s) => s.ui.sessions);
  const evVersion = useApp((s) => s.ev);
  const [outs, setOuts] = useState<OutputFile[]>([]);
  useEffect(() => {
    if (project) void store.host.request("outputs.list", { project }).then((r) => setOuts(r.outputs));
  }, [store, project, evVersion]);
  return (
    <div className="side-list">
      <div className="side-group">项目内全部产出</div>
      {outs.map((o) => (
        <div key={o.output} className="file-row" onClick={() => store.openSheet(o.file, { mode: o.kind === "workpaper" ? "filled" : "raw", title: o.name })}>
          <span className={`file-icon ${o.kind === "report" ? "report" : ""}`}>{o.kind === "report" ? "核" : "XLS"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.name}</div>
            <div className="faint" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {sessions.find((s) => s.session === o.session)?.title ?? o.session}
              {o.task ? ` · 任务 ${o.task}` : ""}
            </div>
          </div>
        </div>
      ))}
      {!outs.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有产出" />}
    </div>
  );
}

function SideFoot() {
  const store = useAppStore();
  const mcp = useApp((s) => s.ev.mcp);
  const modelReady = useApp((s) => s.ui.modelReady);
  const connected = useApp((s) => s.ui.connected);
  const list = Object.values(mcp);
  const online = list.filter((m) => m.state === "connected").length;
  const failed = list.filter((m) => m.state === "failed").length;
  return (
    <div className="side-foot">
      {!connected && (
        <div className="status-line" style={{ color: "var(--danger)" }}>
          <span className="dot failed" />
          和后台的连接断开，正在重连…
        </div>
      )}
      <div className="status-line" onClick={() => store.setUi({ page: "settings" })}>
        <span className={`dot ${modelReady ? "done" : "failed"}`} />
        模型{modelReady ? "已连接" : "未连接"}
      </div>
      <div className="status-line" onClick={() => store.setUi({ page: "settings" })}>
        <span className={`dot ${failed ? "waiting" : online ? "done" : "idle"}`} />
        MCP 服务 {online} 个在线{failed ? `，${failed} 个断开` : ""}
      </div>
      <div className="status-line" onClick={() => store.setUi({ page: "settings" })}>
        <SettingOutlined />
        设置
      </div>
    </div>
  );
}

function fmtSize(n?: number) {
  if (!n) return "";
  if (n > 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  return `${Math.round(n / 1e3)} KB`;
}
