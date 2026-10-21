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
import { useEffect, useMemo, useRef, useState } from "react";
import type { OutputFile, ProjectFile, SessionSummary } from "../../protocol/types";
import { relTime } from "../../lib/format";
import { useApp, useAppStore } from "../../store/context";
import { NewProjectModal } from "./NewProject";

export function Sidebar() {
  const store = useAppStore();
  const ui = useApp((s) => s.ui);
  const project = ui.projects.find((p) => p.project === ui.project);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [renamingProject, setRenamingProject] = useState<string | null>(null);

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
            if (key === "_new") return setCreating(true);
            if (key === "_rename" && project) return setRenamingProject(project.name);
            if (key === "_remove" && project)
              return Modal.confirm({
                title: `从应用中移除「${project.name}」？`,
                content: "项目文件夹和里面的文件都不删，之后可以用同一个文件夹重新建项目。",
                okText: "移除",
                okButtonProps: { danger: true },
                cancelText: "取消",
                onOk: async () => {
                  await store.host.request("project.remove", { project: project.project });
                  const rest = store.get().ui.projects.filter((p) => p.project !== project.project);
                  store.setUi({ projects: rest, project: null, session: null, sessions: [], tabs: [], activeTab: null });
                  if (rest[0]) await store.switchProject(rest[0].project);
                },
              });
            if (key.startsWith("_")) return;
            void store.switchProject(key);
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
      <NewProjectModal open={creating} onClose={() => setCreating(false)} />
      <Modal
        title="重命名项目"
        open={renamingProject !== null}
        onCancel={() => setRenamingProject(null)}
        okButtonProps={{ disabled: !renamingProject?.trim() }}
        onOk={async () => {
          if (project && renamingProject?.trim()) {
            const p = await store.host.request("project.rename", { project: project.project, name: renamingProject.trim() });
            store.setUi((ui) => ({ projects: ui.projects.map((x) => (x.project === p.project ? p : x)) }));
          }
          setRenamingProject(null);
        }}
      >
        <Input value={renamingProject ?? ""} onChange={(e) => setRenamingProject(e.target.value)} />
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
  const filesVersion = useApp((s) => s.ui.filesVersion);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (project) void store.host.request("files.list", { project }).then((r) => setFiles(r.files));
  }, [store, project, filesVersion]);
  return (
    <>
      <div className="side-actions">
        <input
          ref={picker}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const list = [...(e.target.files ?? [])];
            e.target.value = "";
            store.addBrowserFiles(list).catch((err: Error) => Modal.error({ title: "加不进项目", content: err.message }));
          }}
        />
        <Button
          block
          icon={<FolderOpenOutlined />}
          onClick={() =>
            store.host.addFiles
              ? picker.current?.click()
              : Modal.info({ title: "添加资料", content: "回放模式下不能添加资料。" })
          }
        >
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
  const outputsVersion = useApp((s) => s.ui.outputsVersion);
  const [outs, setOuts] = useState<OutputFile[]>([]);
  useEffect(() => {
    if (project) void store.host.request("outputs.list", { project }).then((r) => setOuts(r.outputs));
  }, [store, project, outputsVersion]);
  return (
    <div className="side-list">
      <div className="side-group">项目内全部产出</div>
      {outs.map((o) => (
        <div key={o.output} className="file-row" onClick={() => store.openSheet(o.output, { mode: o.kind === "workpaper" ? "filled" : "raw", title: o.name, task: o.task })}>
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
