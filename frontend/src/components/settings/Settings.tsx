// 设置：独立页面。分组：模型服务、MCP 服务、数据与安全、关于。离开时有未保存的修改会提示。
import {
  ApiOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CloudServerOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  WarningFilled,
} from "@ant-design/icons";
import { Alert, Button, Checkbox, DatePicker, Drawer, Empty, Form, Input, Modal, Radio, Segmented, Select, Switch, Tag, Tooltip } from "antd";
import { useEffect, useState } from "react";
import type { AppInfo, ConnectionTestResult, McpServer, McpServerConfig, McpTestResult, McpTool, PrivacyStatus, Settings as SettingsT } from "../../protocol/types";
import { useApp, useAppStore } from "../../store/context";

type Group = "model" | "mcp" | "privacy" | "about";

export function SettingsPage() {
  const store = useAppStore();
  const dirty = useApp((s) => s.ui.settingsDirty);
  const [group, setGroup] = useState<Group>("model");
  const leave = (fn: () => void) => {
    if (!dirty) return fn();
    Modal.confirm({
      title: "有修改还没保存",
      content: "离开后这些修改会丢失。",
      okText: "不保存，离开",
      cancelText: "留下",
      onOk: () => {
        store.setUi({ settingsDirty: false });
        fn();
      },
    });
  };
  return (
    <section className="workspace">
      <div className="settings">
        <nav className="settings-nav">
          <Button type="text" icon={<ArrowLeftOutlined />} style={{ justifyContent: "flex-start", marginBottom: 10 }} onClick={() => leave(() => store.setUi({ page: "main" }))}>
            返回
          </Button>
          {(
            [
              ["model", <ApiOutlined key="i" />, "模型服务"],
              ["mcp", <CloudServerOutlined key="i" />, "MCP 服务"],
              ["privacy", <SafetyCertificateOutlined key="i" />, "数据与安全"],
              ["about", <InfoCircleOutlined key="i" />, "关于"],
            ] as const
          ).map(([k, icon, label]) => (
            <div key={k} className={`item ${group === k ? "active" : ""}`} onClick={() => leave(() => setGroup(k))}>
              {icon}
              {label}
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <ThemeSwitch />
        </nav>
        <div className="settings-body">
          {group === "model" && <ModelSettings />}
          {group === "mcp" && <McpSettings />}
          {group === "privacy" && <PrivacySettings />}
          {group === "about" && <AboutSettings />}
        </div>
      </div>
    </section>
  );
}

function ThemeSwitch() {
  const store = useAppStore();
  const theme = useApp((s) => s.ui.theme);
  return (
    <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
      <span className="muted" style={{ fontSize: 12 }}>外观</span>
      <Segmented
        size="small"
        value={theme}
        onChange={(v) => store.setUi({ theme: v as "light" | "dark" })}
        options={[
          { value: "light", label: "浅色" },
          { value: "dark", label: "深色" },
        ]}
      />
    </div>
  );
}

// ---------- 模型服务 ----------

export function ModelForm({ onConnected, compact }: { onConnected?: () => void; compact?: boolean }) {
  const store = useAppStore();
  const [s, setS] = useState<SettingsT | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [test, setTest] = useState<ConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void store.host.request("settings.get", {}).then((x) => {
      setS(x);
      setBaseUrl(x.baseUrl);
      setModel(x.model);
    });
  }, [store]);
  const dirty = !!s && (baseUrl !== s.baseUrl || model !== s.model || key !== "");
  useEffect(() => {
    if (!compact) store.setUi({ settingsDirty: dirty });
  }, [dirty, compact, store]);

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    try {
      const r = await store.host.request("connection.test", { baseUrl, key: key || undefined, model: model || undefined });
      setTest(r);
      if (r.ok && r.models?.length && !model) setModel(r.models[0]);
    } finally {
      setTesting(false);
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      await store.host.request("settings.save", { baseUrl, model });
      if (key) await store.host.request("secret.save", { key: "model", value: key });
      const fresh = await store.host.request("settings.get", {});
      setS(fresh);
      setKey("");
      store.setUi({ modelReady: !!fresh.connected, settingsDirty: false });
      onConnected?.();
    } finally {
      setSaving(false);
    }
  };

  if (!s) return <LoadingOutlined />;
  const canSave = test?.ok && !!model;
  return (
    <div className="setting-group">
      <div className="setting-row">
        <span className="label">请求地址</span>
        <div className="ctl">
          <Input value={baseUrl} placeholder="https://llm.example/v1（OpenAI 兼容格式）" onChange={(e) => (setBaseUrl(e.target.value), setTest(null))} />
        </div>
      </div>
      <div className="setting-row">
        <span className="label">API Key</span>
        <div className="ctl">
          <Input.Password
            value={key}
            placeholder={s.hasKey ? "已保存（不显示原文）。要更换就在这里输入新的" : "粘贴 API Key"}
            onChange={(e) => (setKey(e.target.value), setTest(null))}
            visibilityToggle={false}
          />
        </div>
      </div>
      <div className="setting-row">
        <span className="label">模型</span>
        <div className="ctl">
          <Select
            style={{ width: "100%" }}
            value={model || undefined}
            placeholder="测试连接后从服务返回的模型里选"
            onChange={setModel}
            options={(test?.models ?? s.models ?? []).map((m) => ({ value: m, label: m }))}
          />
        </div>
      </div>
      <div className="setting-row">
        <span className="label">连接状态</span>
        <div className="ctl" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {testing ? (
            <span className="muted">
              <LoadingOutlined /> 正在测试…
            </span>
          ) : test ? (
            test.ok ? (
              <span style={{ color: "var(--success)" }}>
                <CheckCircleFilled /> 连接正常，{test.latencyMs} ms，可用模型 {test.models?.length ?? 0} 个
              </span>
            ) : (
              <span style={{ color: "var(--danger)" }}>
                <CloseCircleFilled /> {test.error?.message}
              </span>
            )
          ) : s.connected && !dirty ? (
            <span style={{ color: "var(--success)" }}>
              <CheckCircleFilled /> 已连接
            </span>
          ) : (
            <span className="muted">还没测试</span>
          )}
          <span style={{ flex: 1 }} />
          <Button onClick={() => void runTest()} loading={testing} disabled={!baseUrl}>
            测试连接
          </Button>
          <Tooltip title={canSave ? "" : "测试通过才能保存"}>
            <Button type="primary" disabled={!canSave} loading={saving} onClick={() => void save()}>
              {compact ? "下一步" : "保存"}
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

function ModelSettings() {
  return (
    <div className="settings-section">
      <h2>模型服务</h2>
      <div className="muted">填企业模型的地址和 API Key。测试通过才能保存；API Key 由本机加密保存，界面上不再显示原文。</div>
      <ModelForm />
    </div>
  );
}

// ---------- MCP 服务 ----------

function McpSettings() {
  const store = useAppStore();
  const status = useApp((s) => s.ev.mcp);
  const [servers, setServers] = useState<McpServer[]>([]);
  const [editing, setEditing] = useState<McpServer | "new" | null>(null);
  const load = () => void store.host.request("mcp.list", {}).then((r) => setServers(r.servers));
  useEffect(load, [store, status]);
  return (
    <div className="settings-section">
      <div style={{ display: "flex", alignItems: "center" }}>
        <h2 style={{ flex: 1 }}>MCP 服务</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing("new")}>
          添加服务
        </Button>
      </div>
      <div className="muted">添加内部系统的 MCP 服务后，Agent 就能调用它的工具。服务对所有项目和对话生效。内置的审计工具服务不在这里显示。</div>
      <div className="setting-group">
        {servers.map((s) => {
          const st = status[s.name]?.state ?? s.state;
          return (
            <div key={s.name} className="mcp-server" onClick={() => setEditing(s)}>
              <span className={`dot ${st === "connected" ? "done" : st === "failed" ? "failed" : st === "connecting" ? "running" : "idle"}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>
                  {s.title} <span className="mono faint">{s.name}</span>
                </div>
                <div className="faint" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.transport === "stdio" ? `本机程序 · ${s.command}` : `远程地址 · ${s.url}`}
                </div>
              </div>
              {st === "failed" ? (
                <Tag color="error">{status[s.name]?.error?.message ?? s.error?.message ?? "连接失败"}</Tag>
              ) : (
                <span className="muted" style={{ fontSize: 12 }}>
                  {s.tools.filter((t) => t.enabled).length} 个工具 · {s.tools.filter((t) => t.sideEffect === "mutating" && t.enabled).length} 个会改动系统
                </span>
              )}
              <Switch
                size="small"
                checked={s.enabled}
                onClick={(_, e) => e.stopPropagation()}
                onChange={async (v) => {
                  await store.host.request("mcp.update", { name: s.name, enabled: v });
                  load();
                }}
              />
            </div>
          );
        })}
        {!servers.length && <Empty style={{ padding: 24 }} description="还没有添加外部服务" />}
      </div>
      <McpDrawer
        server={editing}
        onClose={() => {
          setEditing(null);
          load();
        }}
      />
    </div>
  );
}

function McpDrawer({ server, onClose }: { server: McpServer | "new" | null; onClose: () => void }) {
  const store = useAppStore();
  const isNew = server === "new";
  const existing = server && server !== "new" ? server : null;
  const [cfg, setCfg] = useState<McpServerConfig>({ name: "", title: "", enabled: true, transport: "stdio" });
  const [token, setToken] = useState("");
  const [secrets, setSecrets] = useState<{ k: string; v: string }[]>([]);
  const [test, setTest] = useState<McpTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!server) return;
    setTest(null);
    setToken("");
    if (existing) {
      const { state: _s, error: _e, tools: t, ...c } = existing;
      void _s;
      void _e;
      setCfg(c);
      setTools(t.map((x) => ({ ...x })));
      setSecrets((c.secretEnv ?? []).map((k) => ({ k, v: "" })));
    } else {
      setCfg({ name: "", title: "", enabled: true, transport: "stdio", args: [], env: {} });
      setTools([]);
      setSecrets([]);
    }
  }, [server, existing]);

  const nameOk = /^[A-Za-z0-9_]+$/.test(cfg.name);
  const runTest = async () => {
    setTesting(true);
    try {
      const payload = isNew
        ? { ...cfg, token: token || undefined, secrets: Object.fromEntries(secrets.filter((s) => s.k).map((s) => [s.k, s.v])) }
        : { name: cfg.name };
      const r = await store.host.request("mcp.test", payload);
      setTest(r);
      if (r.ok && r.tools && isNew) setTools(r.tools);
    } finally {
      setTesting(false);
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      const sec = Object.fromEntries(secrets.filter((s) => s.k && s.v).map((s) => [s.k, s.v]));
      if (isNew) {
        await store.host.request("mcp.add", { ...cfg, secretEnv: secrets.map((s) => s.k).filter(Boolean), token: token || undefined, secrets: sec });
        if (tools.length) await store.host.request("mcp.update", { name: cfg.name, tools: tools.map((t) => ({ tool: t.tool, enabled: t.enabled, sideEffect: t.sideEffect })) });
      } else {
        // 没改的令牌不传，宿主保留原值
        await store.host.request("mcp.update", {
          ...cfg,
          token: token || undefined,
          secrets: Object.keys(sec).length ? sec : undefined,
          tools: tools.map((t) => ({ tool: t.tool, enabled: t.enabled, sideEffect: t.sideEffect })),
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={!!server}
      onClose={onClose}
      width={620}
      title={isNew ? "添加 MCP 服务" : `${existing?.title}`}
      extra={
        <div style={{ display: "flex", gap: 8 }}>
          {existing && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() =>
                Modal.confirm({
                  title: `删除 ${existing.title}？`,
                  content: "同时删除它保存的令牌。",
                  okText: "删除",
                  okButtonProps: { danger: true },
                  cancelText: "取消",
                  onOk: async () => {
                    await store.host.request("mcp.remove", { name: existing.name });
                    onClose();
                  },
                })
              }
            />
          )}
          <Button onClick={() => void runTest()} loading={testing} disabled={isNew && (!nameOk || (cfg.transport === "stdio" ? !cfg.command : !cfg.url))}>
            试连
          </Button>
          <Button type="primary" loading={saving} disabled={isNew && (!nameOk || !cfg.title)} onClick={() => void save()}>
            保存
          </Button>
        </div>
      }
    >
      <Form layout="vertical" requiredMark={false}>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item label="显示名称" style={{ flex: 1 }}>
            <Input value={cfg.title} placeholder="OA 系统" onChange={(e) => setCfg({ ...cfg, title: e.target.value })} />
          </Form.Item>
          <Form.Item
            label="服务名"
            style={{ flex: 1 }}
            validateStatus={cfg.name && !nameOk ? "error" : undefined}
            help={cfg.name && !nameOk ? "只能用字母、数字和下划线" : "模型看到的工具名是 mcp__服务名__工具名"}
          >
            <Input value={cfg.name} disabled={!isNew} placeholder="oa" onChange={(e) => setCfg({ ...cfg, name: e.target.value })} />
          </Form.Item>
        </div>
        <Form.Item label="接法">
          <Radio.Group
            value={cfg.transport}
            disabled={!isNew}
            onChange={(e) => setCfg({ ...cfg, transport: e.target.value })}
            options={[
              { value: "stdio", label: "本机程序" },
              { value: "http", label: "远程地址" },
            ]}
          />
        </Form.Item>
        {cfg.transport === "stdio" ? (
          <>
            <Form.Item label="程序路径">
              <Input value={cfg.command} placeholder="C:\tools\oa-mcp\oa-mcp.exe" onChange={(e) => setCfg({ ...cfg, command: e.target.value })} />
            </Form.Item>
            <Form.Item label="参数" help="空格分隔">
              <Input value={(cfg.args ?? []).join(" ")} onChange={(e) => setCfg({ ...cfg, args: e.target.value.split(/\s+/).filter(Boolean) })} />
            </Form.Item>
            <Form.Item label="敏感环境变量" help="加密保存，读取时只显示变量名。已保存的值不回显，留空表示不改">
              {secrets.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <Input style={{ width: 180 }} value={s.k} placeholder="变量名" onChange={(e) => setSecrets(secrets.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} />
                  <Input.Password value={s.v} placeholder={existing ? "已保存" : "值"} visibilityToggle={false} onChange={(e) => setSecrets(secrets.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} />
                </div>
              ))}
              <Button size="small" icon={<PlusOutlined />} onClick={() => setSecrets([...secrets, { k: "", v: "" }])}>
                添加变量
              </Button>
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item label="地址">
              <Input value={cfg.url} placeholder="https://contract.intra.example/mcp" onChange={(e) => setCfg({ ...cfg, url: e.target.value })} />
            </Form.Item>
            <Form.Item label="令牌" help="以 Authorization: Bearer 发送，加密保存">
              <Input.Password value={token} placeholder={cfg.hasToken ? "已保存（不显示原文）。要更换就输入新的" : "可选"} visibilityToggle={false} onChange={(e) => setToken(e.target.value)} />
            </Form.Item>
          </>
        )}
      </Form>
      {test && (
        <Alert
          style={{ marginBottom: 16 }}
          type={test.ok ? "success" : "error"}
          showIcon
          message={test.ok ? `连接正常：${test.serverInfo?.name} ${test.serverInfo?.version}，${test.latencyMs} ms，${test.tools?.length ?? 0} 个工具` : `${test.error?.code}：${test.error?.message}`}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <b style={{ flex: 1 }}>工具</b>
        <span className="faint" style={{ fontSize: 12 }}>会改动系统的工具，每次调用前都要你确认</span>
      </div>
      <div className="setting-group">
        {tools.map((t, i) => (
          <div key={t.tool} className="tool-line">
            <div style={{ minWidth: 0 }}>
              <div>
                <span className="mono">{t.tool}</span>
                {t.readOnlyHint && t.sideEffect === "mutating" && (
                  <Tooltip title="服务声明这个工具只读，可以考虑标为只读。是否有副作用以你标的为准">
                    <Tag color="blue" style={{ marginLeft: 6 }}>
                      建议只读
                    </Tag>
                  </Tooltip>
                )}
              </div>
              <div className="faint" style={{ fontSize: 12 }}>
                {t.description} {t.argsSummary && <span className="mono">（{t.argsSummary}）</span>}
              </div>
            </div>
            <Segmented
              size="small"
              value={t.sideEffect}
              onChange={(v) => setTools(tools.map((x, j) => (j === i ? { ...x, sideEffect: v as McpTool["sideEffect"] } : x)))}
              options={[
                { value: "readonly", label: "只读" },
                { value: "mutating", label: <span>{t.sideEffect === "mutating" && <WarningFilled style={{ color: "var(--warning)" }} />} 会改动系统</span> },
              ]}
            />
            <Switch size="small" checked={t.enabled} onChange={(v) => setTools(tools.map((x, j) => (j === i ? { ...x, enabled: v } : x)))} />
          </div>
        ))}
        {!tools.length && <div className="faint" style={{ padding: 16 }}>{isNew ? "先试连，列出这个服务的全部工具" : "服务没有连上，看不到工具"}</div>}
      </div>
    </Drawer>
  );
}

// ---------- 数据与安全 ----------

function PrivacySettings() {
  const store = useAppStore();
  const [p, setP] = useState<PrivacyStatus | null>(null);
  useEffect(() => void store.host.request("privacy.status", {}).then(setP), [store]);
  return (
    <div className="settings-section">
      <h2>数据与安全</h2>
      <div className="muted">下面每一项都是启动时从实际生效的配置里读出来的，不是写死的说明。内网版本这些开关固定，界面上不能改。</div>
      <div className="setting-group">
        {p?.outbound.map((o) => (
          <div key={o.item} className="setting-row">
            <span className="label">{o.label}</span>
            <div className="ctl muted" style={{ fontSize: 12 }}>
              {o.target ? (Array.isArray(o.target) ? o.target.join("、") || "无" : o.target) : ""}
            </div>
            {o.warning ? (
              <Tag color="error" icon={<WarningFilled />}>
                和预期不符
              </Tag>
            ) : o.state === "on" ? (
              <Tag color="blue">外连</Tag>
            ) : (
              <Tag>已关闭</Tag>
            )}
          </div>
        ))}
        <div className="setting-row">
          <span className="label">命令行执行</span>
          <div className="ctl" />
          <Tag>{p?.shell === "on" ? "已开启" : "已关闭"}</Tag>
        </div>
        <div className="setting-row">
          <span className="label">原文件</span>
          <div className="ctl muted" style={{ fontSize: 12 }}>只读；产出写到项目文件夹里的「输出」</div>
        </div>
      </div>
      {p && <div className="faint" style={{ fontSize: 12 }}>核验时间 {new Date(p.verifiedAt).toLocaleString()}</div>}
    </div>
  );
}

// ---------- 关于 ----------

function AboutSettings() {
  const store = useAppStore();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [range, setRange] = useState<[string, string]>([new Date(Date.now() - 86400000).toISOString().slice(0, 10), new Date().toISOString().slice(0, 10)]);
  const [content, setContent] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => void store.host.request("app.info", {}).then(setInfo), [store]);
  const exportLogs = async () => {
    const go = async () => {
      setBusy(true);
      try {
        const r = await store.host.request("logs.export", { from: range[0], to: range[1], includeContent: content });
        Modal.success({ title: "日志已导出", content: `${r.file}（${(r.sizeBytes / 1e6).toFixed(1)} MB）。API Key 和令牌不在日志里。` });
      } finally {
        setBusy(false);
      }
    };
    if (content)
      Modal.confirm({ title: "日志将包含资料内容", content: "包括消息原文、工具参数和结果。只在需要排查具体数据问题时勾选。", okText: "仍然导出", cancelText: "取消", onOk: go });
    else await go();
  };
  return (
    <div className="settings-section">
      <h2>关于</h2>
      <div className="setting-group">
        {info &&
          (
            [
              ["应用版本", `${info.version}（${info.buildTime}）`],
              ["底座", info.harness],
              ["审计工具服务", info.tools],
              ["接口版本", Object.values(info.interfaces).join("、")],
              ["运行时", Object.entries(info.runtimes).map(([k, v]) => `${k} ${v}`).join("、")],
              ["数据目录", info.dataDir],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="setting-row">
              <span className="label">{k}</span>
              <div className="ctl mono" style={{ fontSize: 12 }}>
                {v}
              </div>
            </div>
          ))}
      </div>
      <div className="setting-group">
        <div className="setting-row">
          <span className="label">导出日志</span>
          <div className="ctl" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <DatePicker.RangePicker
              size="small"
              onChange={(_, s) => s[0] && s[1] && setRange([s[0], s[1]])}
              placeholder={[range[0], range[1]]}
            />
            <Checkbox checked={content} onChange={(e) => setContent(e.target.checked)}>
              包含资料内容
            </Checkbox>
            <span style={{ flex: 1 }} />
            <Button loading={busy} onClick={() => void exportLogs()}>
              导出…
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
