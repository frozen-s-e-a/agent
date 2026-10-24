// 应用入口：主题、状态、宿主连接。
// 宿主两种：真实宿主（app-host，接 Harness）和假宿主（回放样例事件，开发界面用）。界面代码不分。
import { App as AntApp, ConfigProvider, theme as antTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useEffect, useMemo, useRef, useState } from "react";
import { FakeHost } from "./host/fake/FakeHost";
import { HttpHost } from "./host/http/HttpHost";
import type { HostClient } from "./host/client";
import { cssVars, DARK, LIGHT } from "./lib/tokens";
import { AppStore, useStore } from "./store/appStore";
import { StoreCtx, TokensCtx } from "./store/context";
import { Sidebar } from "./components/layout/Sidebar";
import { Workspace } from "./components/layout/Workspace";
import { SettingsPage } from "./components/settings/Settings";
import { Onboarding } from "./components/settings/Onboarding";
import { DevPanel } from "./devtools/DevPanel";

const params = new URLSearchParams(location.search);
// ?host=fake|real 优先；否则 npm run dev:real 和打包版连真实宿主，npm run dev 用回放
const HOST_KIND = params.get("host") ?? (import.meta.env.MODE === "real" || import.meta.env.PROD ? "real" : "fake");

export function App() {
  const host = useMemo<HostClient>(() => (HOST_KIND === "real" ? new HttpHost() : new FakeHost({ connected: !params.has("onboarding") })), []);
  const store = useMemo(() => new AppStore(host), [host]);
  if (import.meta.env.DEV) Object.assign(window, { __store: store, __host: host });
  const ui = useStore(store, (s) => s.ui);
  const [booted, setBooted] = useState(false);

  const bootedOnce = useRef(false);
  useEffect(() => {
    if (bootedOnce.current) return; // StrictMode 下 effect 会跑两次，只启动一次
    bootedOnce.current = true;
    if (params.get("theme") === "dark" || params.get("theme") === "light") store.setUi({ theme: params.get("theme") as "dark" | "light" });
    if (params.get("chat")) store.setUi({ chatMode: params.get("chat") as never });
    void (async () => {
      const s = await host.request("settings.get", {});
      store.setUi({ modelReady: s.connected });
      if (s.connected) await enter(store, host);
      setBooted(true);
    })();
  }, [host, store]);

  const t = ui.theme === "dark" ? DARK : LIGHT;
  useEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(cssVars(t))) root.style.setProperty(k, v);
    root.dataset.theme = ui.theme;
    document.body.style.background = t.bg;
  }, [t, ui.theme]);

  return (
    <ConfigProvider
      locale={zhCN}
      button={{ autoInsertSpace: false }}
      theme={{
        algorithm: ui.theme === "dark" ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: t.accent,
          colorPrimaryHover: t.accentHover,
          colorPrimaryActive: t.accentActive,
          colorError: t.danger,
          colorWarning: t.warning,
          colorSuccess: t.success,
          colorBgLayout: t.bg,
          colorBgContainer: t.panel,
          colorBgElevated: t.panel,
          colorBorder: t.borderStrong,
          colorBorderSecondary: t.border,
          colorText: t.text,
          borderRadius: 8,
          fontFamily: t.font.replace(/^\d+px\s*/, ""),
          fontSize: 13,
        },
      }}
    >
      <AntApp>
        <TokensCtx.Provider value={t}>
          <StoreCtx.Provider value={store}>
            {!booted ? null : ui.modelReady === false || (!(host instanceof FakeHost) && ui.projects.length === 0) ? (
              <Onboarding
                startAt={ui.modelReady === false ? 0 : 1}
                sample={host instanceof FakeHost}
                onDone={() => {
                  store.setUi({ modelReady: true });
                  void enter(store, host);
                }}
              />
            ) : (
              <div className="app">
                <Sidebar />
                {ui.page === "settings" ? <SettingsPage /> : <Workspace />}
              </div>
            )}
            {host instanceof FakeHost && params.get("dev") !== "0" && <DevPanel host={host} />}
          </StoreCtx.Provider>
        </TokensCtx.Provider>
      </AntApp>
    </ConfigProvider>
  );
}

/** 进主界面：载入项目和对话。假宿主默认打开回放对话，?seq=N 直接回放到第 N 条事件；真实宿主打开最近的项目和对话 */
async function enter(store: AppStore, host: HostClient) {
  await store.loadProjects();
  if (host instanceof FakeHost) {
    const session = params.get("session") ?? "S-41d2";
    await store.openSession(session);
    const seq = Number(params.get("seq"));
    if (seq > 0) host.jumpTo(seq);
  } else {
    const project = store.get().ui.project;
    if (project) await store.switchProject(project, true);
  }
  if (params.get("page") === "settings") store.setUi({ page: "settings" });
}
